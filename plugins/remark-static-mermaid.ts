import type mermaidModule from "isomorphic-mermaid";

type MarkdownNode = {
  type: string;
  lang?: string;
  meta?: string;
  value?: string;
  children?: MarkdownNode[];
};

type Mermaid = typeof mermaidModule;

let mermaidPromise: Promise<Mermaid> | null = null;

function ensureCssStyleSheet() {
  if ("CSSStyleSheet" in globalThis) return;

  globalThis.CSSStyleSheet = class CSSStyleSheet {
    cssRules: CSSRule[] = [];
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
      this.cssRules.splice(index, 0, { cssText: rule } as CSSRule);
      return index;
    }

    deleteRule(index: number) {
      this.cssRules.splice(index, 1);
    }
  } as unknown as typeof CSSStyleSheet;
}

async function getMermaid() {
  ensureCssStyleSheet();

  mermaidPromise ??= import("isomorphic-mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      theme: "dark",
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
  return `<figure class="${getDiagramClassName(meta)}">${svg}</figure>`;
}

async function transformMermaidCodeBlocks(node: MarkdownNode, nextId: () => string): Promise<void> {
  if (!node.children) return;

  for (const child of node.children) {
    if (child.type === "code" && child.lang === "mermaid" && typeof child.value === "string") {
      child.type = "html";
      child.value = await renderMermaid(child.value, nextId(), child.meta);
      delete child.lang;
      delete child.meta;
      continue;
    }

    await transformMermaidCodeBlocks(child, nextId);
  }
}

export default function staticMermaid() {
  return async (tree: MarkdownNode) => {
    let diagramIndex = 0;
    await transformMermaidCodeBlocks(tree, () => `mermaid-${diagramIndex++}`);
  };
}
