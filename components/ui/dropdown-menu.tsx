"use client";

// Our wrapper over Radix DropdownMenu (behaviour and accessibility: focus, arrow keys, Escape, typeahead).
// Pages import from here, never from radix-ui directly, so the primitive can be swapped in one place.
import { DropdownMenu as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";

export const Menu = Primitive.Root;
export const MenuTrigger = Primitive.Trigger;
export const MenuItem = ({ className = "", ...props }: ComponentPropsWithoutRef<typeof Primitive.Item>) => (
  <Primitive.Item
    {...props}
    className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-field px-3 text-sm outline-none transition-colors data-[highlighted]:bg-base-300/70 ${className}`}
  />
);
export const MenuSeparator = () => <Primitive.Separator className="my-1 h-px bg-border" />;

export function MenuContent({ className = "", children, ...props }: ComponentPropsWithoutRef<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        align="end"
        sideOffset={8}
        {...props}
        className={`z-30 w-72 max-w-[calc(100vw-2.5rem)] rounded-box border border-border bg-surface p-2 shadow-2xl ${className}`}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
