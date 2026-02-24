import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:brightness-110",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:brightness-110",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:brightness-110",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = JSX.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge(props: BadgeProps) {
  const [local, others] = splitProps(props, ["class", "variant"]);
  return <div class={cn(badgeVariants({ variant: local.variant }), local.class)} {...others} />;
}
