import type { JSX } from "solid-js";

type LabFrameProps = {
  id: string;
  label: string;
  class?: string;
  children: JSX.Element;
};

export function LabFrame(props: LabFrameProps) {
  return (
    <section
      class={`not-prose my-8 ${props.class ?? ""}`}
      aria-label={props.label}
      data-concept-lab={props.id}
    >
      {props.children}
    </section>
  );
}
