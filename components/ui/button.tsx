import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// The one place pages get buttons from, so the look library (FlyonUI) can be swapped here.
// Fitts: every size keeps a touch target of 44px or more. Von Restorff: use `primary` once per view.
type Variant = "primary" | "soft" | "outline";
type Size = "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "btn-primary",
  soft: "btn-soft btn-primary",
  outline: "btn-outline",
};
const SIZE: Record<Size, string> = { md: "min-h-11", lg: "btn-lg min-h-12" };

function classes(variant: Variant, size: Size, className?: string): string {
  return ["btn", VARIANT[variant], SIZE[size], className].filter(Boolean).join(" ");
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

export function Button({ variant = "outline", size = "md", className, ...rest }: Common & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { children: ReactNode }) {
  return <button {...rest} className={classes(variant, size, className)} />;
}

// In-app navigation (client-side). Use `ButtonAnchor` for full-page targets such as the OAuth start route.
export function ButtonLink({ href, variant = "outline", size = "md", className, children }: Common & { href: string }) {
  return (
    <Link href={href} className={classes(variant, size, className)}>
      {children}
    </Link>
  );
}

export function ButtonAnchor({ href, variant = "outline", size = "md", className, children }: Common & { href: string }) {
  return (
    <a href={href} className={classes(variant, size, className)}>
      {children}
    </a>
  );
}
