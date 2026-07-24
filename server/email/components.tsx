/** @jsx emailElement */

import type { JSX, ParentProps } from "solid-js";
import { escape, renderToString, ssrElement } from "solid-js/web";

const fontFamily = "Arial, Helvetica, sans-serif";

type EmailElementType =
  | keyof JSX.IntrinsicElements
  | ((props: Record<string, unknown>) => JSX.Element);

function resolveIntrinsicChild(child: unknown): unknown {
  if (Array.isArray(child)) return child.map(resolveIntrinsicChild);
  if (typeof child === "function") return resolveIntrinsicChild(child());
  if (typeof child === "string") return escape(child);
  return child;
}

export function emailElement(
  type: EmailElementType,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): JSX.Element {
  const resolvedChildren = children.length === 1 ? children[0] : children;

  if (typeof type === "function") {
    return type({
      ...props,
      children: resolvedChildren,
    });
  }

  return ssrElement(
    type,
    props,
    resolveIntrinsicChild(resolvedChildren),
    false,
  ) as unknown as JSX.Element;
}

export function renderEmail(template: () => JSX.Element) {
  return `<!doctype html>${renderToString(template)}`;
}

export function EmailLayout(props: ParentProps<{ preview: string }>) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: "0", padding: "0", "background-color": "#f4f4f5" }}>
        <div
          style={{
            display: "none",
            overflow: "hidden",
            "max-height": "0",
            opacity: "0",
            color: "transparent",
          }}
        >
          {props.preview}
        </div>
        <table
          role="presentation"
          style={{
            width: "100%",
            "border-collapse": "collapse",
            "background-color": "#f4f4f5",
          }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "32px 16px" }}>
                {props.children}
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function EmailCard(props: ParentProps) {
  return (
    <table
      role="presentation"
      style={{
        width: "100%",
        "max-width": "600px",
        "border-collapse": "collapse",
        "background-color": "#ffffff",
        border: "1px solid #e4e4e7",
        "border-radius": "8px",
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "32px", "font-family": fontFamily, color: "#18181b" }}>
            {props.children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailHeading(props: ParentProps) {
  return (
    <h1
      style={{
        margin: "0 0 8px",
        "font-family": fontFamily,
        "font-size": "24px",
        "line-height": "32px",
        color: "#18181b",
      }}
    >
      {props.children}
    </h1>
  );
}

export function EmailText(props: ParentProps) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        "font-family": fontFamily,
        "font-size": "14px",
        "line-height": "22px",
        color: "#52525b",
      }}
    >
      {props.children}
    </p>
  );
}
