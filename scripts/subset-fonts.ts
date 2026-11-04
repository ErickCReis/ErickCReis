/**
 * Subsets the site's web fonts into a preloaded core file and a lazy extended
 * file per face, and writes them with a manifest to web/assets/fonts/.
 *
 * Run by hand and commit the output:
 *
 *     bun run fonts:subset              # builds the site, then subsets
 *     bun run fonts:subset --no-build   # reuse the current dist/
 *
 * Rerun it when:
 *   - content starts using a character outside the core on many pages (the
 *     report lists used characters that landed in an extended file), or a new
 *     site locale needs its letters added to SITE_LOCALE_LETTERS;
 *   - a style starts using a weight, italic, width, or OpenType feature that
 *     FAMILIES does not keep (for example bold serif text, a condensed width,
 *     or tabular figures in a new font). Update FAMILIES first;
 *   - you bump GOOGLE_FONTS_COMMIT to pick up new upstream font versions.
 *
 * What each face keeps:
 *   - characters: Latin-1 + Latin Extended-A + LEGACY_COVERAGE (everything
 *     the previous fontsource "latin" files rendered), intersected with the
 *     font. Characters the old files did not render (for example "→" in the
 *     mono font) stay out, so they keep rendering from the same fallback.
 *   - core file: ASCII, curly quotes, dashes, ellipsis, bullet, the letters of
 *     the site's locales, characters on the home pages, and any character used
 *     on CORE_PAGE_SHARE of pages. Everything else goes to the extended file.
 *     Each file's CSS `unicode-range` lists exactly the code points it has.
 *   - variation axes and hinting: see FAMILIES.
 *   - OpenType features: the ones browsers turn on by default (minus `locl`,
 *     which these fonts only define for languages the site does not use) plus
 *     the ones the site's CSS enables.
 *
 * Kerning between a core glyph and an extended glyph is lost, because the
 * browser shapes each file separately. That is why every character the site
 * uses on many pages lives in the core.
 */
import { $ } from "bun";
import { mkdir, rm } from "node:fs/promises";
import * as path from "node:path";
import * as hb from "harfbuzzjs";
// @ts-expect-error wawoff2 ships no types; its two functions are typed below.
import * as wawoff2 from "wawoff2";

const { compress, decompress } = wawoff2 as {
  compress: (font: Uint8Array) => Promise<Uint8Array>;
  decompress: (font: Uint8Array) => Promise<Uint8Array>;
};

const ROOT = path.resolve(import.meta.dir, "..");
const OUT_DIR = path.join(ROOT, "web/assets/fonts");
const CACHE_DIR = path.join(ROOT, "node_modules/.cache/subset-fonts");
const DIST_DIR = path.join(ROOT, "dist");

const GOOGLE_FONTS_COMMIT = "f60b457bc90062c17f9bf80a882da25a86f56200";

/** Share of built pages a character must appear on to go into the core. */
const CORE_PAGE_SHARE = 0.2;

/** Characters on the landing pages always go into the core. */
const CORE_PAGES = ["index.html", "pt-BR/index.html"];

/**
 * Always in the core: ASCII, the punctuation most pages use, and the bullet
 * (lists are on about half the pages, and some engines draw `disc` markers
 * with this glyph).
 */
const CORE_ALWAYS = new Set([...range(0x20, 0x7e).map(toChar), ...Array.from("‘’“”–—…•")]);

/**
 * Letters of the site's locales (en-US needs none beyond ASCII). With these in
 * the core, no page needs an extended file for ordinary text, so accented
 * letters never load later than, or kern apart from, the rest.
 */
const SITE_LOCALE_LETTERS = new Set("ÁÂÃÀÇÉÊÍÓÔÕÚáâãàçéêíóôõú");

const LATIN_1 = new Set(range(0xa0, 0xff).map(toChar));
const LATIN_EXT_A = new Set(range(0x100, 0x17f).map(toChar));

/**
 * Code points outside Latin-1 / Latin Extended-A that the previous fontsource
 * "latin" files both listed in their unicode-range and had glyphs for. Kept so
 * nothing that rendered in the web font before falls back to a system font.
 */
const LEGACY_COVERAGE: Record<FamilyKey, string> = {
  sans:
    "U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+2013-2014,U+2018-201A,U+201C-201E," +
    "U+2022,U+2026,U+2039-203A,U+20AC,U+2122,U+2191,U+2193,U+2212",
  serif:
    "U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2002,U+2009,U+200B," +
    "U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2032-2033,U+2039-203A," +
    "U+2044,U+20AC,U+2122,U+2212,U+2215",
  mono:
    "U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+2013-2014,U+2018-201A," +
    "U+201C-201E,U+2022,U+2026,U+2032-2033,U+2039-203A,U+2044,U+20AC,U+2122," +
    "U+2191,U+2193,U+2212,U+2215",
};

/**
 * Features browsers apply by default to Latin text. `locl` is left out: these
 * fonts only define it for AZE/CAT/CRT/KAZ/MOL/ROM/TAT/TRK, never en or pt.
 */
const DEFAULT_FEATURES = [
  "ccmp",
  "rvrn",
  "liga",
  "clig",
  "calt",
  "rlig",
  "rclt",
  "kern",
  "mark",
  "mkmk",
  "curs",
  "dist",
];

/** Name IDs kept besides HarfBuzz's default 0-6: license, license URL, typographic names. */
const KEEP_NAME_IDS = [13, 14, 16, 17];

type FamilyKey = "sans" | "serif" | "mono";
type Face = {
  style: "normal" | "italic";
  /** The @font-face descriptor. It stays what Astro emitted before. */
  weight: string;
  path: string;
  sha256: string;
  /** Axes pinned to one value; any other axis keeps its full range. */
  pin?: Record<string, number>;
};
type Family = {
  name: string;
  license: string;
  features: string[];
  /** OFL Reserved Font Name: a subset copy may not use it in its names. */
  rename?: { from: string; reservedName: string };
  /** Keep TrueType hinting unless --drop-hinting is passed. */
  hinted?: boolean;
  faces: Face[];
};

/**
 * How each family is used (measured from computed styles on every page):
 *   sans:  normal 400/500/600, width 100%, tabular figures in tables. No
 *          italic text today; italic matches normal so <em> and bold inside
 *          <em> render as before if they appear. wdth is pinned at its default
 *          (nothing sets a width). wght keeps the full 400-700: ending it at
 *          600 saves about 1 KB per file, but 600 is not a master, so the
 *          rescaled deltas change antialiasing on 500/600 text.
 *   serif: normal 400 only. Nothing overrides it, so wght is pinned (39%
 *          smaller). Serif text at another weight would render at 400 without
 *          synthetic bold, because the @font-face still says 400-700: remove
 *          the pin before using it that way.
 *   mono:  static 400 and 500. Plex has no `tnum`; it is monospaced. Its
 *          TrueType hinting stays unless --drop-hinting is passed (about
 *          2.9 KB less per core; identical on macOS, but Windows can apply
 *          the hints, so that rendering is unverified).
 */
const FAMILIES: Record<FamilyKey, Family> = {
  sans: {
    name: "Instrument Sans",
    license: "ofl/instrumentsans/OFL.txt",
    features: [...DEFAULT_FEATURES, "tnum"],
    faces: [
      {
        style: "normal",
        weight: "400 700",
        path: "ofl/instrumentsans/InstrumentSans[wdth,wght].ttf",
        sha256: "b24f1812584816958afcf22e22d08e44318c5e51651e25d2438efdde389b33b1",
        pin: { wdth: 100 },
      },
      {
        style: "italic",
        weight: "400 700",
        path: "ofl/instrumentsans/InstrumentSans-Italic[wdth,wght].ttf",
        sha256: "a74203cc5066a3b2f8de1a7b0887ef897773c2319dc86c911f8e85350cde0d07",
        pin: { wdth: 100 },
      },
    ],
  },
  serif: {
    name: "STIX Two Text",
    license: "ofl/stixtwotext/OFL.txt",
    features: DEFAULT_FEATURES,
    faces: [
      {
        style: "normal",
        weight: "400 700",
        path: "ofl/stixtwotext/STIXTwoText[wght].ttf",
        sha256: "7962b8b7811e6a896c9a91a0bccbb5241047770eb24d4997c5cb5fe21d5c0df2",
        pin: { wght: 400 },
      },
      {
        style: "italic",
        weight: "400 700",
        path: "ofl/stixtwotext/STIXTwoText-Italic[wght].ttf",
        sha256: "88c0e2e316eaff56eddc9e51e4850317e2a1e490bbf758b2dec4793aedba9c74",
        pin: { wght: 400 },
      },
    ],
  },
  mono: {
    name: "ErickR Mono",
    license: "ofl/ibmplexmono/OFL.txt",
    features: DEFAULT_FEATURES,
    rename: { from: "IBM Plex Mono", reservedName: "Plex" },
    hinted: true,
    faces: [
      {
        style: "normal",
        weight: "400",
        path: "ofl/ibmplexmono/IBMPlexMono-Regular.ttf",
        sha256: "6a3412f058c7d8dfd9170c41e85ade48e5156ecb89356110ca57a0a27734af46",
      },
      {
        style: "normal",
        weight: "500",
        path: "ofl/ibmplexmono/IBMPlexMono-Medium.ttf",
        sha256: "a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Unicode helpers

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function toChar(codePoint: number) {
  return String.fromCodePoint(codePoint);
}

function parseRanges(text: string) {
  return new Set(
    text.split(",").flatMap((part) => {
      const [lo, hi = lo] = part.trim().replace("U+", "").split("-");
      return range(parseInt(lo!, 16), parseInt(hi, 16)).map(toChar);
    }),
  );
}

function formatRanges(codePoints: Iterable<number>) {
  const sorted = [...codePoints].sort((a, b) => a - b);
  const out: string[] = [];
  const hex = (c: number) => c.toString(16).toUpperCase().padStart(4, "0");
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]!;
    while (sorted[i + 1] === sorted[i]! + 1) i++;
    out.push(start === sorted[i] ? `U+${hex(start)}` : `U+${hex(start)}-${hex(sorted[i]!)}`);
  }
  return out;
}

function describe(chars: Iterable<string>) {
  return [...chars]
    .sort()
    .map((c) => `${c}(U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`)
    .join(" ");
}

const intersect = <T>(a: Set<T>, b: Set<T>) => new Set([...a].filter((x) => b.has(x)));
const union = <T>(...sets: Iterable<T>[]) => new Set(sets.flatMap((s) => [...s]));
const minus = <T>(a: Set<T>, b: Set<T>) => new Set([...a].filter((x) => !b.has(x)));

// ---------------------------------------------------------------------------
// Character usage from the built site

/** Astro only emits these entities in text; decode them and numeric ones. */
function decodeEntities(text: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ref: string) =>
    ref[0] === "#"
      ? String.fromCodePoint(
          parseInt(
            ref.slice(ref[1] === "x" || ref[1] === "X" ? 2 : 1),
            ref[1]?.toLowerCase() === "x" ? 16 : 10,
          ),
        )
      : (named[ref] ?? match),
  );
}

async function pageCharacters(html: string) {
  let text = "";
  let skip = 0;
  await new HTMLRewriter()
    .on("head, script, style, template, noscript", {
      element(el) {
        skip++;
        el.onEndTag(() => void skip--);
      },
    })
    .on("input, textarea", {
      element(el) {
        text += (el.getAttribute("placeholder") ?? "") + (el.getAttribute("value") ?? "");
      },
    })
    .onDocument({
      text(chunk) {
        if (!skip) text += decodeEntities(chunk.text);
      },
    })
    .transform(new Response(html))
    .arrayBuffer();
  const chars = new Set(Array.from(text).filter((c) => c.codePointAt(0)! >= 0x20));
  // Count both cases: CSS text-transform can render either.
  for (const c of Array.from(chars))
    for (const v of [c.toUpperCase(), c.toLowerCase()])
      if (Array.from(v).length === 1) chars.add(v);
  return chars;
}

async function usedCharacters(dist: string) {
  const pages = await Array.fromAsync(new Bun.Glob("**/*.html").scan(dist));
  if (!pages.length) throw new Error(`No HTML in ${dist}. Build the site first.`);
  const pagesPerChar = new Map<string, number>();
  const landing = new Set<string>();
  for (const page of pages) {
    const chars = await pageCharacters(await Bun.file(path.join(dist, page)).text());
    for (const c of chars) pagesPerChar.set(c, (pagesPerChar.get(c) ?? 0) + 1);
    if (CORE_PAGES.includes(page)) for (const c of chars) landing.add(c);
  }
  // Strings only rendered by client-side code (live data states).
  const runtime = new Set<string>();
  for await (const file of new Bun.Glob("_astro/*.{js,css}").scan(dist)) {
    const source = await Bun.file(path.join(dist, file)).text();
    const text = file.endsWith(".css")
      ? [...source.matchAll(/content:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join("")
      : source;
    for (const c of text) if (c.codePointAt(0)! > 0x7e) runtime.add(c);
  }
  const frequent = new Set(
    [...pagesPerChar].filter(([, n]) => n / pages.length >= CORE_PAGE_SHARE).map(([c]) => c),
  );
  return {
    pageCount: pages.length,
    frequent: union(frequent, landing),
    used: union(pagesPerChar.keys(), runtime),
  };
}

// ---------------------------------------------------------------------------
// Upstream files

async function fetchUpstream(file: string, sha256?: string) {
  const cache = Bun.file(path.join(CACHE_DIR, GOOGLE_FONTS_COMMIT, file));
  let data: Uint8Array;
  if (await cache.exists()) {
    data = await cache.bytes();
  } else {
    const url = `https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_COMMIT}/${encodeURI(file)}`;
    console.log(`  downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    data = new Uint8Array(await response.arrayBuffer());
    await Bun.write(cache, data);
  }
  const digest = new Bun.CryptoHasher("sha256").update(data).digest("hex");
  if (sha256 && digest !== sha256)
    throw new Error(`sha256 mismatch for ${file}: expected ${sha256}, got ${digest}`);
  return data;
}

// ---------------------------------------------------------------------------
// Raw sfnt tables. hb-subset cannot rename a font or keep the head bounding
// box, so those two changes are made on the table bytes.

function readTables(font: Uint8Array) {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const tables = new Map<string, Uint8Array>();
  for (let i = 0; i < view.getUint16(4); i++) {
    const record = 12 + 16 * i;
    const tag = String.fromCharCode(...font.subarray(record, record + 4));
    const offset = view.getUint32(record + 8);
    tables.set(tag, font.slice(offset, offset + view.getUint32(record + 12)));
  }
  return { flavor: view.getUint32(0), tables };
}

function checksum(bytes: Uint8Array) {
  const padded = new Uint8Array((bytes.length + 3) & ~3);
  padded.set(bytes);
  const view = new DataView(padded.buffer);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + view.getUint32(i)) >>> 0;
  return sum;
}

function writeTables(flavor: number, tables: Map<string, Uint8Array>) {
  const tags = [...tables.keys()].sort();
  const headerSize = 12 + 16 * tags.length;
  const size = tags.reduce(
    (total, tag) => total + ((tables.get(tag)!.length + 3) & ~3),
    headerSize,
  );
  const font = new Uint8Array(size);
  const view = new DataView(font.buffer);
  const entrySelector = Math.floor(Math.log2(tags.length));
  view.setUint32(0, flavor);
  view.setUint16(4, tags.length);
  view.setUint16(6, 16 << entrySelector);
  view.setUint16(8, entrySelector);
  view.setUint16(10, tags.length * 16 - (16 << entrySelector));
  new DataView(tables.get("head")!.buffer).setUint32(8, 0); // checksumAdjustment
  let offset = headerSize;
  tags.forEach((tag, i) => {
    const data = tables.get(tag)!;
    const record = 12 + 16 * i;
    font.set(new TextEncoder().encode(tag), record);
    view.setUint32(record + 4, checksum(data));
    view.setUint32(record + 8, offset);
    view.setUint32(record + 12, data.length);
    font.set(data, offset);
    offset += (data.length + 3) & ~3;
  });
  const headOffset = view.getUint32(12 + 16 * tags.indexOf("head") + 8);
  view.setUint32(headOffset + 8, (0xb1b0afba - checksum(font)) >>> 0);
  return font;
}

/** Replaces `from` (and its space-less PostScript form) in every name record. */
function renameNameTable(name: Uint8Array, from: string, to: string) {
  const view = new DataView(name.buffer, name.byteOffset, name.byteLength);
  if (view.getUint16(0) !== 0) throw new Error("Only name table format 0 is supported");
  const count = view.getUint16(2);
  const storage = view.getUint16(4);
  const isUtf16 = (platform: number) => platform === 0 || platform === 3;
  const records = range(0, count - 1).map((i) => {
    const r = 6 + 12 * i;
    const [platform, encoding, language, nameId, length, offset] = range(0, 5).map((k) =>
      view.getUint16(r + 2 * k),
    );
    const bytes = name.subarray(storage + offset!, storage + offset! + length!);
    let text = isUtf16(platform!)
      ? new TextDecoder("utf-16be").decode(bytes)
      : String.fromCharCode(...bytes);
    text = text.replaceAll(from, to).replaceAll(from.replaceAll(" ", ""), to.replaceAll(" ", ""));
    const encoded = isUtf16(platform!)
      ? new Uint8Array(
          range(0, text.length - 1).flatMap((i) => [
            text.charCodeAt(i) >> 8,
            text.charCodeAt(i) & 0xff,
          ]),
        )
      : new Uint8Array(range(0, text.length - 1).map((i) => text.charCodeAt(i)));
    return { header: [platform!, encoding!, language!, nameId!], encoded };
  });
  const header = 6 + 12 * count;
  const out = new Uint8Array(header + records.reduce((n, r) => n + r.encoded.length, 0));
  const outView = new DataView(out.buffer);
  outView.setUint16(2, count);
  outView.setUint16(4, header);
  let offset = 0;
  records.forEach(({ header: fields, encoded }, i) => {
    [...fields, encoded.length, offset].forEach((value, k) =>
      outView.setUint16(6 + 12 * i + 2 * k, value),
    );
    out.set(encoded, header + offset);
    offset += encoded.length;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Font processing: HarfBuzz's subsetter (hb-subset), called on the WASM build
// that ships with harfbuzzjs.

const HB_SUBSET_SETS_DROP_TABLE_TAG = 3;
const HB_SUBSET_SETS_NAME_ID = 4;
const HB_SUBSET_SETS_LAYOUT_FEATURE_TAG = 6;
const HB_SUBSET_FLAGS_NO_HINTING = 0x1;
const HB_SUBSET_FLAGS_NOTDEF_OUTLINE = 0x40;
const HB_SUBSET_FLAGS_GLYPH_NAMES = 0x80;
const HB_SUBSET_FLAGS_OPTIMIZE_IUP_DELTAS = 0x400;

type HbSubset = Record<string, (...args: number[]) => number> & { memory: WebAssembly.Memory };
const wasmPath = Bun.resolveSync("harfbuzzjs/dist/harfbuzz-subset.wasm", import.meta.dir);
const { instance } = await WebAssembly.instantiate(await Bun.file(wasmPath).arrayBuffer());
const hbs = instance.exports as unknown as HbSubset;
hbs._initialize!();

const hbTag = (tag: string) =>
  Array.from(tag).reduce((n, c) => (n << 8) | c.charCodeAt(0), 0) >>> 0;

function hbSubset(
  font: Uint8Array,
  chars: Set<string>,
  family: Family,
  face: Face,
  keepHinting: boolean,
) {
  const fontPtr = hbs.malloc!(font.length);
  new Uint8Array(hbs.memory.buffer).set(font, fontPtr);
  const blob = hbs.hb_blob_create!(fontPtr, font.length, 2 /* writable */, 0, 0);
  const hbFace = hbs.hb_face_create!(blob, 0);
  hbs.hb_blob_destroy!(blob);
  const input = hbs.hb_subset_input_create_or_fail!();
  const fill = (set: number, values: number[], clear = false) => {
    if (clear) hbs.hb_set_clear!(set);
    for (const value of values) hbs.hb_set_add!(set, value);
  };
  fill(
    hbs.hb_subset_input_unicode_set!(input),
    [...chars].map((c) => c.codePointAt(0)!),
  );
  fill(
    hbs.hb_subset_input_set!(input, HB_SUBSET_SETS_LAYOUT_FEATURE_TAG),
    family.features.map(hbTag),
    true,
  );
  fill(hbs.hb_subset_input_set!(input, HB_SUBSET_SETS_NAME_ID), KEEP_NAME_IDS);
  fill(
    hbs.hb_subset_input_set!(input, HB_SUBSET_SETS_DROP_TABLE_TAG),
    ["DSIG", "meta", "STAT"].map(hbTag),
  );
  // Each flag keeps rendering identical to the original font:
  // - glyph names: without them (post format 3) Chrome on macOS renders every
  //   glyph slightly differently;
  // - .notdef contours: Chrome shapes a run with this file before falling back
  //   for characters it lacks, and an empty .notdef changes how the rest of
  //   the run renders;
  // - optimized IUP deltas: otherwise fixing an axis rounds the interpolated
  //   deltas and moves points by up to half a unit.
  let flags =
    hbs.hb_subset_input_get_flags!(input) |
    HB_SUBSET_FLAGS_GLYPH_NAMES |
    HB_SUBSET_FLAGS_NOTDEF_OUTLINE |
    HB_SUBSET_FLAGS_OPTIMIZE_IUP_DELTAS;
  if (!keepHinting) flags |= HB_SUBSET_FLAGS_NO_HINTING;
  hbs.hb_subset_input_set_flags!(input, flags);
  for (const [tag, value] of Object.entries(face.pin ?? {})) {
    if (!hbs.hb_subset_input_pin_axis_location!(input, hbFace, hbTag(tag), value))
      throw new Error(`Cannot pin ${tag}`);
  }
  const result = hbs.hb_subset_or_fail!(hbFace, input);
  hbs.hb_subset_input_destroy!(input);
  if (!result) throw new Error(`hb-subset failed for ${face.path}`);
  const resultBlob = hbs.hb_face_reference_blob!(result);
  const offset = hbs.hb_blob_get_data!(resultBlob, 0);
  const subset = new Uint8Array(hbs.memory.buffer).slice(
    offset,
    offset + hbs.hb_blob_get_length!(resultBlob),
  );
  hbs.hb_blob_destroy!(resultBlob);
  hbs.hb_face_destroy!(result);
  hbs.hb_face_destroy!(hbFace);
  hbs.free!(fontPtr);
  return subset;
}

async function subsetFace(
  upstream: Uint8Array,
  chars: Set<string>,
  family: Family,
  face: Face,
  keepHinting: boolean,
) {
  const { flavor, tables } = readTables(hbSubset(upstream, chars, family, face, keepHinting));
  // hb-subset recalculates the head bounding box for the subset; Chrome on
  // macOS reads it when rasterizing, so keep upstream's value.
  tables.get("head")!.set(readTables(upstream).tables.get("head")!.subarray(36, 44), 36);
  if (family.rename)
    tables.set("name", renameNameTable(tables.get("name")!, family.rename.from, family.name));
  return compress(writeTables(flavor, tables));
}

function hbFont(data: Uint8Array, variations: Record<string, number> = {}) {
  const face = new hb.Face(new hb.Blob(data));
  const font = new hb.Font(face);
  font.setVariations(
    Object.entries(variations).map(([tag, value]) => new hb.Variation(tag, value)),
  );
  return { face, font };
}

function tableView(face: hb.Face, tag: string) {
  const bytes = face.referenceTable(tag);
  return bytes?.length ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) : undefined;
}

/** Fields that set line height, Astro's fallback size-adjust, and macOS rasterization. */
const METRICS: [table: string, offset: number, label: string][] = [
  ["head", 18, "unitsPerEm"],
  ["head", 36, "xMin"],
  ["head", 38, "yMin"],
  ["head", 40, "xMax"],
  ["head", 42, "yMax"],
  ["hhea", 4, "ascender"],
  ["hhea", 6, "descender"],
  ["hhea", 8, "lineGap"],
  ["OS/2", 68, "sTypoAscender"],
  ["OS/2", 70, "sTypoDescender"],
  ["OS/2", 72, "sTypoLineGap"],
  ["OS/2", 74, "usWinAscent"],
  ["OS/2", 76, "usWinDescent"],
];

async function verify(
  woff2: Uint8Array,
  upstream: Uint8Array,
  expected: Set<string>,
  family: Family,
  face: Face,
  keepHinting: boolean,
  label: string,
) {
  const problems: string[] = [];
  const out = hbFont(await decompress(woff2));
  const up = hbFont(upstream, face.pin);

  const cmap = new Set([...out.face.collectUnicodes()].map(toChar));
  const missing = minus(expected, cmap);
  const extra = minus(cmap, expected);
  if (missing.size || extra.size)
    problems.push(`cmap differs: missing ${describe(missing)} extra ${describe(extra)}`);

  if (family.rename) {
    for (const { nameId, language } of out.face.listNames()) {
      const text = out.face.getName(nameId, language);
      if (![0, 13, 14].includes(nameId) && text.includes(family.rename.reservedName))
        problems.push(`name ${nameId} still says ${JSON.stringify(text)}`);
    }
  }

  const axes = out.face.getAxisInfos();
  for (const tag of Object.keys(face.pin ?? {}))
    if (axes[tag]) problems.push(`axis ${tag} should be pinned`);
  for (const [tag, info] of Object.entries(up.face.getAxisInfos())) {
    if (
      face.pin?.[tag] === undefined &&
      (axes[tag]?.min !== info.min || axes[tag]?.max !== info.max)
    )
      problems.push(`axis ${tag} range changed`);
  }

  const features = union(
    out.face.getTableFeatureTags("GSUB"),
    out.face.getTableFeatureTags("GPOS"),
  );
  const unexpected = minus(features, new Set(family.features));
  if (unexpected.size) problems.push(`unexpected features ${[...unexpected].join(" ")}`);

  if (Boolean(tableView(out.face, "fpgm")) !== keepHinting)
    problems.push(`hinting is ${keepHinting ? "missing" : "present"}`);
  if (tableView(out.face, "post")?.getUint32(0) !== 0x20000)
    problems.push("post table lost its glyph names");

  for (const [table, offset, field] of METRICS) {
    const [a, b] = [out.face, up.face].map((f) => tableView(f, table)!.getInt16(offset));
    if (a !== b) problems.push(`${table}.${field} changed ${b} -> ${a}`);
  }
  const typoBit = (f: hb.Face) => tableView(f, "OS/2")!.getUint16(62) & 0x80;
  if (typoBit(out.face) !== typoBit(up.face)) problems.push("OS/2 USE_TYPO_METRICS changed");

  // Outlines and advances match upstream at every weight the face can render.
  const ranged = Object.entries(up.face.getAxisInfos()).filter(
    ([tag]) => face.pin?.[tag] === undefined,
  );
  const locations = ranged.reduce<Record<string, number>[]>(
    (locs, [tag, { min, max }]) =>
      locs.flatMap((loc) =>
        range(0, (max - min) / 50).map((i) => ({ ...loc, [tag]: min + 50 * i })),
      ),
    [{}],
  );
  for (const location of locations) {
    const a = hbFont(await decompress(woff2), location).font;
    const b = hbFont(upstream, { ...face.pin, ...location }).font;
    const differ = [...cmap].filter((c) => {
      const [ga, gb] = [a.nominalGlyph(c.codePointAt(0)!)!, b.nominalGlyph(c.codePointAt(0)!)!];
      return a.glyphHAdvance(ga) !== b.glyphHAdvance(gb) || a.glyphToPath(ga) !== b.glyphToPath(gb);
    });
    if (differ.length)
      problems.push(
        `${differ.length} glyphs differ from upstream at ${JSON.stringify(location)}: ${describe(differ.slice(0, 12))}`,
      );
  }
  return problems.map((p) => `${label}: ${p}`);
}

// ---------------------------------------------------------------------------

const args = new Set(Bun.argv.slice(2));
const dropHinting = args.has("--drop-hinting");

if (!args.has("--no-build")) {
  console.log("Building the site to read its characters…");
  await $`bun --bun astro build`.cwd(ROOT).quiet();
}

const { pageCount, frequent, used } = await usedCharacters(DIST_DIR);
console.log(`Read ${pageCount} pages; ${used.size} distinct characters in use.\n`);

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(path.join(OUT_DIR, "licenses"), { recursive: true });

const manifest = {
  generatedBy: "scripts/subset-fonts.ts",
  googleFontsCommit: GOOGLE_FONTS_COMMIT,
  families: {} as Record<string, unknown>,
};
const report: { file: string; bytes: number; codePoints: number }[] = [];
const notes: string[] = [];
const problems: string[] = [];

for (const [key, family] of Object.entries(FAMILIES) as [FamilyKey, Family][]) {
  await Bun.write(
    path.join(OUT_DIR, "licenses", `${key}-OFL.txt`),
    await fetchUpstream(family.license),
  );
  const keepHinting = Boolean(family.hinted) && !dropHinting;
  const slug = family.name.toLowerCase().replaceAll(" ", "-");
  const faces = [];
  let keep = new Set<string>();
  for (const face of family.faces) {
    const upstream = await fetchUpstream(face.path, face.sha256);
    const upstreamCmap = new Set([...hbFont(upstream).face.collectUnicodes()].map(toChar));
    keep = intersect(
      union(LATIN_1, LATIN_EXT_A, CORE_ALWAYS, parseRanges(LEGACY_COVERAGE[key])),
      upstreamCmap,
    );
    const core = intersect(keep, union(CORE_ALWAYS, SITE_LOCALE_LETTERS, frequent));
    const subsets = { core, extended: minus(keep, core) };
    // Static faces need the weight in the file name; variable ones do not.
    const weightSlug = face.weight.includes(" ") ? "" : `-${face.weight}`;
    for (const [subset, chars] of Object.entries(subsets)) {
      const label = `${slug}-${face.style}${weightSlug}-${subset}`;
      const woff2 = await subsetFace(upstream, chars, family, face, keepHinting);
      problems.push(...(await verify(woff2, upstream, chars, family, face, keepHinting, label)));
      await Bun.write(path.join(OUT_DIR, `${label}.woff2`), woff2);
      const codePoints = [...chars].map((c) => c.codePointAt(0)!);
      faces.push({
        src: `./web/assets/fonts/${label}.woff2`,
        style: face.style,
        weight: face.weight,
        subset,
        unicodeRange: formatRanges(codePoints),
      });
      report.push({ file: `${label}.woff2`, bytes: woff2.length, codePoints: codePoints.length });
    }
    const misplaced = intersect(used, subsets.extended);
    if (misplaced.size)
      notes.push(
        `${family.name} ${face.style} ${face.weight}: used characters in the extended file: ${describe(misplaced)}`,
      );
  }
  const uncovered = [...minus(used, keep)].filter((c) => !/\p{C}/u.test(c));
  if (uncovered.length)
    notes.push(`${family.name}: used but rendered by a fallback font: ${describe(uncovered)}`);
  manifest.families[key] = { name: family.name, faces };
}

await Bun.write(path.join(OUT_DIR, "fonts.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(Bun.inspect.table(report));
for (const note of notes) console.log(note);

if (problems.length) {
  console.error(`\nVerification failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(
  `\nWrote ${report.length} fonts to ${path.relative(ROOT, OUT_DIR)}. All checks passed.`,
);
