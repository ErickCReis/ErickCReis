import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AstroIntegration } from "astro";
import type { ESTree, Plugin } from "vite";
import { hashTranslationKey } from "./translate-runtime";

const VIRTUAL_MODULE_ID = "virtual:translate";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const VIRTUAL_RUNTIME_MODULE_ID = "virtual:translate/runtime";
const DEFAULT_GENERATED_DIR = "web/i18n";
const TRANSLATE_RUNTIME_MODULE_PATH = fileURLToPath(
  new URL("./translate-runtime.ts", import.meta.url),
);

type TranslationCatalog = Record<string, string | null>;
type ClientCatalog = Record<string, string>;
type LocaleCatalogs = Record<string, TranslationCatalog>;
type LocaleClientCatalogs = Record<string, ClientCatalog>;

type TranslationCollector = {
  add(values: Iterable<string>): void;
  clear(): void;
  values(): string[];
};

type SharedTranslateOptions = {
  locales: string[];
  defaultLocale: string;
  generatedDir?: string;
};

type CreateTranslateVitePluginOptions = SharedTranslateOptions & {
  collector?: TranslationCollector;
  clearOnBuildStart?: boolean;
  rootDir?: string;
};

function createCollector(): TranslationCollector {
  const translations = new Set<string>();

  return {
    add(values) {
      for (const value of values) {
        translations.add(value);
      }
    },
    clear() {
      translations.clear();
    },
    values() {
      return [...translations].sort((left, right) => left.localeCompare(right));
    },
  };
}

function walkAst(node: ESTree.Node, visit: (node: ESTree.Node) => void): void {
  visit(node);

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (
          typeof entry === "object" &&
          entry !== null &&
          "type" in entry &&
          typeof entry.type === "string"
        ) {
          walkAst(entry as ESTree.Node, visit);
        }
      }

      continue;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      typeof value.type === "string"
    ) {
      walkAst(value as ESTree.Node, visit);
    }
  }
}

function resolveStaticString(node: ESTree.Node | null | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    const [firstQuasi] = node.quasis;
    return firstQuasi ? (firstQuasi.value.cooked ?? "") : "";
  }

  if (node.type === "BinaryExpression" && node.operator === "+") {
    const left = resolveStaticString(node.left);
    const right = resolveStaticString(node.right);
    return left !== null && right !== null ? `${left}${right}` : null;
  }

  if (node.type === "ParenthesizedExpression") {
    return resolveStaticString(node.expression);
  }

  return null;
}

function resolveCallTranslationValue(node: ESTree.CallExpression): string | null {
  const argumentIndex = node.arguments.length >= 2 ? 1 : 0;
  const argument = node.arguments[argumentIndex];
  return argument && argument.type !== "SpreadElement" ? resolveStaticString(argument) : null;
}

function normalizeLocaleCatalog(rawCatalog: unknown): TranslationCatalog {
  if (!rawCatalog || typeof rawCatalog !== "object" || Array.isArray(rawCatalog)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawCatalog).filter(
      ([hash, translation]) =>
        typeof hash === "string" &&
        hash.length > 0 &&
        (translation === null || typeof translation === "string"),
    ),
  );
}

async function importModuleIfExists(filePath: string) {
  try {
    await access(filePath);
  } catch {
    return null;
  }

  const module = await import(/* @vite-ignore */ pathToFileURL(filePath).href);
  return module.default ?? null;
}

async function loadGeneratedLocaleCatalogs(options: {
  rootDir: string;
  generatedDir: string;
  locales: string[];
  defaultLocale: string;
}): Promise<LocaleCatalogs> {
  return Object.fromEntries(
    await Promise.all(
      options.locales.map(async (locale) => {
        if (locale === options.defaultLocale) {
          return [locale, {}] as const;
        }

        const filePath = resolve(options.rootDir, options.generatedDir, `${locale}.ts`);
        const rawCatalog = await importModuleIfExists(filePath);
        return [locale, normalizeLocaleCatalog(rawCatalog)] as const;
      }),
    ),
  );
}

function createClientCatalog(catalog: TranslationCatalog): ClientCatalog {
  return Object.fromEntries(
    Object.entries(catalog).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function createVirtualModuleSource(options: {
  locales: string[];
  defaultLocale: string;
  localeCatalogs: LocaleCatalogs;
  isServerBuild: boolean;
}): string {
  const clientCatalogs: LocaleClientCatalogs = Object.fromEntries(
    options.locales.map((locale) => [
      locale,
      createClientCatalog(options.localeCatalogs[locale] ?? {}),
    ]),
  );

  const runtimeConfig = JSON.stringify({
    locales: options.locales,
    defaultLocale: options.defaultLocale,
    buildCatalogs: options.isServerBuild ? options.localeCatalogs : {},
    clientCatalogs,
  });

  return [
    `import { createTranslateRuntime } from ${JSON.stringify(VIRTUAL_RUNTIME_MODULE_ID)};`,
    "",
    "export const {",
    "  locales,",
    "  defaultLocale,",
    "  resolveLocale,",
    "  getPathLocale,",
    "  getLocale,",
    "  t,",
    `} = createTranslateRuntime(${runtimeConfig});`,
    "",
  ].join("\n");
}

function createDefaultCatalog(sourceStrings: string[]): Record<string, string> {
  return Object.fromEntries(
    sourceStrings.map((value) => [hashTranslationKey(value), value] as const),
  );
}

function createLocaleCatalogSkeleton(
  sourceStrings: string[],
  existingCatalog: TranslationCatalog,
): TranslationCatalog {
  return Object.fromEntries(
    sourceStrings.map((value) => {
      const hash = hashTranslationKey(value);
      return [hash, hash in existingCatalog ? existingCatalog[hash] : null] as const;
    }),
  );
}

function serializeTsObject(entries: readonly (readonly [string, string | null])[]): string {
  if (entries.length === 0) {
    return "{}";
  }

  return `{\n${entries
    .map(
      ([key, value]) =>
        `  ${JSON.stringify(key)}: ${value === null ? "null" : JSON.stringify(value)},`,
    )
    .join("\n")}\n}`;
}

function createDefaultModule(catalog: Record<string, string>): string {
  const entries = Object.entries(catalog) as [string, string][];

  return [
    `export const translations = ${serializeTsObject(entries)} as const;`,
    "",
    "export type TranslationHash = keyof typeof translations;",
    "export type TranslationCatalog = typeof translations;",
    "export type TranslationOverrides = Partial<Record<TranslationHash, string | null>>;",
    "",
    "export default translations;",
    "",
  ].join("\n");
}

function toCommentText(value: string): string {
  return value.replace(/\r?\n/g, "\\n");
}

function createLocaleModule(
  defaultLocale: string,
  catalog: TranslationCatalog,
  defaultCatalog: Record<string, string>,
): string {
  const entries = Object.entries(catalog) as [string, string | null][];
  const body =
    entries.length === 0
      ? "{}"
      : `{\n${entries
          .map(
            ([hash, value]) =>
              `  // ${toCommentText(defaultCatalog[hash] ?? hash)}\n  ${JSON.stringify(hash)}: ${
                value === null ? "null" : JSON.stringify(value)
              },`,
          )
          .join("\n")}\n}`;

  return [
    `import type { TranslationOverrides } from "./${defaultLocale}";`,
    "",
    `const translations = ${body} satisfies TranslationOverrides;`,
    "",
    "export default translations;",
    "",
  ].join("\n");
}

export function extractTranslationsFromCode(ast: ESTree.Program): string[] {
  const directBindings = new Set<string>();
  const namespaceBindings = new Set<string>();

  for (const statement of ast.body) {
    if (
      statement.type !== "ImportDeclaration" ||
      typeof statement.source.value !== "string" ||
      (statement.source.value !== VIRTUAL_MODULE_ID &&
        statement.source.value !== RESOLVED_VIRTUAL_MODULE_ID)
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === "ImportSpecifier" &&
        specifier.imported.type === "Identifier" &&
        specifier.imported.name === "t"
      ) {
        directBindings.add(specifier.local.name);
      }

      if (specifier.type === "ImportNamespaceSpecifier") {
        namespaceBindings.add(specifier.local.name);
      }
    }
  }

  if (directBindings.size === 0 && namespaceBindings.size === 0) {
    return [];
  }

  const translations = new Set<string>();

  walkAst(ast, (node) => {
    if (node.type !== "CallExpression") {
      return;
    }

    const value = resolveCallTranslationValue(node);
    if (value === null) {
      return;
    }

    if (node.callee.type === "Identifier") {
      if (directBindings.has(node.callee.name)) {
        translations.add(value);
      }
      return;
    }

    if (
      node.callee.type === "MemberExpression" &&
      node.callee.computed === false &&
      node.callee.object.type === "Identifier" &&
      namespaceBindings.has(node.callee.object.name) &&
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "t"
    ) {
      translations.add(value);
    }
  });

  return [...translations];
}

export function createTranslateVitePlugin({
  locales,
  defaultLocale,
  collector = createCollector(),
  clearOnBuildStart = true,
  generatedDir = DEFAULT_GENERATED_DIR,
  rootDir = process.cwd(),
}: CreateTranslateVitePluginOptions): Plugin {
  let isBuild = false;

  return {
    name: "translate-virtual-module",
    enforce: "post",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    buildStart() {
      if (isBuild && clearOnBuildStart) {
        collector.clear();
      }
    },
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }

      if (id === VIRTUAL_RUNTIME_MODULE_ID) {
        return TRANSLATE_RUNTIME_MODULE_PATH;
      }

      return null;
    },
    async load(...args) {
      const [id, loadOptions] = args as [string, { ssr?: boolean }?];

      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return null;
      }

      const localeCatalogs = await loadGeneratedLocaleCatalogs({
        rootDir,
        generatedDir,
        locales,
        defaultLocale,
      });

      return createVirtualModuleSource({
        locales,
        defaultLocale,
        localeCatalogs,
        isServerBuild: loadOptions?.ssr === true,
      });
    },
    transform(code, id) {
      if (!isBuild || !code.includes(VIRTUAL_MODULE_ID)) {
        return null;
      }

      try {
        const translations = extractTranslationsFromCode(this.parse(code));
        collector.add(translations);
      } catch (error) {
        this.warn(
          `translate-virtual-module: failed to inspect ${id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      return null;
    },
  };
}

export default function astroTranslate({
  locales,
  defaultLocale,
  generatedDir = DEFAULT_GENERATED_DIR,
}: SharedTranslateOptions): AstroIntegration {
  if (locales.length === 0) {
    throw new Error("astro-translate: expected at least one locale");
  }

  if (!locales.includes(defaultLocale)) {
    throw new Error("astro-translate: defaultLocale must be included in locales");
  }

  const collector = createCollector();
  let rootDir = process.cwd();

  const localeUnion = locales.map((locale) => JSON.stringify(locale)).join(" | ");
  const typeDefinition = `declare module "virtual:translate" {
  export type Locale = ${localeUnion};
  export type LocaleCatalog = Record<string, string>;
  export const locales: readonly Locale[];
  export const defaultLocale: "${defaultLocale}";
  export function resolveLocale(value?: string | null): Locale;
  export function getPathLocale(pathname?: string | null): Locale;
  export function getLocale(): Locale;
  export function t(value: string): string;
  export function t(locale: Locale, value: string): string;
}
`;

  return {
    name: "astro-translate",
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        rootDir = fileURLToPath(config.root);

        updateConfig({
          vite: {
            plugins: [
              createTranslateVitePlugin({
                collector,
                clearOnBuildStart: false,
                locales,
                defaultLocale,
                generatedDir,
                rootDir,
              }),
            ],
          },
        });
      },
      "astro:config:done": ({ injectTypes }) => {
        injectTypes({
          filename: "virtual-translate.d.ts",
          content: typeDefinition,
        });
      },
      "astro:build:start": () => {
        collector.clear();
      },
      "astro:build:done": async () => {
        const sourceStrings = collector.values();
        const generatedDirPath = resolve(rootDir, generatedDir);
        const defaultCatalog = createDefaultCatalog(sourceStrings);

        await mkdir(generatedDirPath, { recursive: true });
        await writeFile(
          resolve(generatedDirPath, `${defaultLocale}.ts`),
          createDefaultModule(defaultCatalog),
          "utf8",
        );

        for (const locale of locales) {
          if (locale === defaultLocale) {
            continue;
          }

          const filePath = resolve(generatedDirPath, `${locale}.ts`);
          const existingCatalog = normalizeLocaleCatalog(await importModuleIfExists(filePath));
          const localeCatalog = createLocaleCatalogSkeleton(sourceStrings, existingCatalog);

          await writeFile(
            filePath,
            createLocaleModule(defaultLocale, localeCatalog, defaultCatalog),
            "utf8",
          );
        }
      },
    },
  };
}
