import { defineMdastPlugin } from "satteri";
import type mermaidModule from "isomorphic-mermaid";

type Mermaid = typeof mermaidModule;

let mermaidPromise: Promise<Mermaid> | null = null;

function ensureCssStyleSheet() {
  if ("CSSStyleSheet" in globalThis) return;

  class MinimalCssStyleSheet {
    cssRules: { cssText: string }[] = [];
    rules = this.cssRules;
    ownerRule = null;

    replace(text: string) {
      this.replaceSync(text);
      return Promise.resolve(this);
    }

    replaceSync(_text?: string) {
      this.cssRules.length = 0;
    }

    insertRule(rule: string, index = this.cssRules.length) {
      this.cssRules.splice(index, 0, { cssText: rule });
      return index;
    }

    deleteRule(index: number) {
      this.cssRules.splice(index, 1);
    }
  }

  Object.defineProperty(globalThis, "CSSStyleSheet", {
    configurable: true,
    writable: true,
    value: MinimalCssStyleSheet,
  });
}

async function getMermaid() {
  ensureCssStyleSheet();

  mermaidPromise ??= import("isomorphic-mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      theme: "base",
      themeVariables: {
        background: "#090f15",
        primaryColor: "#121921",
        primaryTextColor: "#edf2f8",
        primaryBorderColor: "#3a4658",
        lineColor: "#7ce3fd",
        arrowheadColor: "#7ce3fd",
        edgeLabelBackground: "#090f15",
        fontFamily: "monospace",
        fontSize: "14px",
        radius: 9,
        strokeWidth: 1.25,
      },
      flowchart: {
        curve: "rounded",
        nodeSpacing: 20,
        padding: 22,
        rankSpacing: 24,
      },
      state: {
        nodeSpacing: 20,
        rankSpacing: 24,
      },
    });

    return mermaid;
  });

  return mermaidPromise;
}

function getDiagramClassName(meta?: string) {
  const classes = ["mermaid-diagram"];

  if (meta?.split(/\s+/).includes("center")) {
    classes.push("mermaid-diagram--center");
  }

  return classes.join(" ");
}

async function renderMermaid(source: string, id: string, meta?: string) {
  const mermaid = await getMermaid();
  const { svg } = await mermaid.render(id, source);
  const intrinsicWidth = svg.match(/viewBox="[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+[\d.]+"/)?.[1];
  const width = intrinsicWidth
    ? ` style="--mermaid-width: ${Math.ceil(Number(intrinsicWidth))}px"`
    : "";

  return `<figure class="${getDiagramClassName(meta)}"${width}>${svg}</figure>`;
}

// Sätteri (Astro 7's default Markdown processor) plugin. The `code` visitor
// matches ```mermaid fenced blocks and returns the rendered SVG via the
// `rawHtml` escape hatch, replacing the code node at build time. Async visitors
// are supported, so mermaid's async render works directly. Exported as a
// factory so each compile gets a fresh diagram counter.
export default function staticMermaid() {
  let diagramIndex = 0;

  return defineMdastPlugin({
    name: "static-mermaid",
    async code(node) {
      if (node.lang !== "mermaid" || typeof node.value !== "string") {
        return;
      }

      const html = await renderMermaid(
        node.value,
        `mermaid-${diagramIndex++}`,
        node.meta ?? undefined,
      );
      return { rawHtml: html };
    },
  });
}
