import type { JSX } from "solid-js";

type ConceptLabProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: JSX.Element;
};

export function ConceptLab(props: ConceptLabProps) {
  const titleId = `${props.id}-title`;
  const descriptionId = `${props.id}-description`;

  return (
    <section
      class="not-prose my-10 overflow-hidden rounded-2xl border border-slate-200/15 bg-slate-950/65 shadow-2xl shadow-slate-950/30"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-concept-lab={props.id}
    >
      <header class="border-b border-slate-200/10 bg-slate-900/45 px-4 py-4 sm:px-5">
        <p class="font-mono text-xxs tracking-[0.18em] text-emerald-200/70 uppercase">
          {props.eyebrow}
        </p>
        <h2 id={titleId} class="mt-1 font-serif text-xl tracking-wide text-slate-50 sm:text-2xl">
          {props.title}
        </h2>
        <p id={descriptionId} class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300/75">
          {props.description}
        </p>
      </header>
      <div class="p-4 sm:p-5">{props.children}</div>
    </section>
  );
}

type LabCardProps = {
  title?: string;
  children: JSX.Element;
  accent?: "blue" | "emerald" | "amber" | "slate";
};

const cardAccentClasses = {
  blue: "border-blue-300/20 bg-blue-400/5",
  emerald: "border-emerald-300/20 bg-emerald-400/5",
  amber: "border-amber-300/20 bg-amber-400/5",
  slate: "border-slate-200/10 bg-slate-900/40",
} as const;

export function LabCard(props: LabCardProps) {
  return (
    <section class={`rounded-xl border p-3.5 ${cardAccentClasses[props.accent ?? "slate"]}`}>
      {props.title ? (
        <h3 class="mb-2 font-mono text-xs tracking-wide text-slate-200 uppercase">{props.title}</h3>
      ) : null}
      {props.children}
    </section>
  );
}

type LabMetricProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function LabMetric(props: LabMetricProps) {
  return (
    <dl class="rounded-lg border border-slate-200/10 bg-slate-950/45 px-3 py-2.5">
      <dt class="font-mono text-xxs tracking-wider text-slate-400 uppercase">{props.label}</dt>
      <dd class="mt-1">
        <span class="block font-mono text-lg text-slate-100">{props.value}</span>
        {props.hint ? (
          <span class="mt-1 block text-xs leading-relaxed text-slate-400">{props.hint}</span>
        ) : null}
      </dd>
    </dl>
  );
}
