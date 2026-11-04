"use client";

import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/dropdown-menu";

// Jakob: the avatar opens an account menu, like every app. Fitts: 44px trigger and 44px items.
export function UserMenu({ name, email, picture }: { name: string; email: string; picture?: string }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" aria-label="Account menu" className="group flex min-h-11 items-center gap-2 rounded-full border border-transparent py-1 pe-2 ps-1 transition-colors hover:border-border hover:bg-base-300/40 data-[state=open]:border-primary/60">
          <Avatar name={name} picture={picture} />
          <span className="hidden max-w-32 truncate text-sm sm:inline">{name}</span>
          <Icon name="chevron" className="size-4 text-muted transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </MenuTrigger>
      <MenuContent>
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar name={name} picture={picture} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
        </div>
        <MenuSeparator />
        <MenuItem asChild>
          <a href="/api/gmail/start">
            <Icon name="refresh" className="size-4 text-muted" />
            Sync Gmail
          </a>
        </MenuItem>
        <form method="post" action="/api/auth/logout">
          <MenuItem asChild>
            <button type="submit">
              <Icon name="logout" className="size-4 text-muted" />
              Sign out
            </button>
          </MenuItem>
        </form>
      </MenuContent>
    </Menu>
  );
}
