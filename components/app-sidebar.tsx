"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Layers, Leaf } from "lucide-react"
import type { SessionAccess } from "@/lib/auth"
import { getMenuIcon } from "@/lib/menu-icons"

type SidebarUser = {
  name: string
  email: string
  avatar: string
  // Menu dan button yang boleh dipakai, dari sesi login
  access: SessionAccess
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  // Menu dibangun dari hak akses sesi, sudah urut menurut seq dari server
  const navMain = React.useMemo(
    () =>
      user.access.menus.map((menu) => {
        const Icon = getMenuIcon(menu.icon) ?? Layers
        return {
          title: menu.name,
          url: menu.url,
          icon: <Icon />,
          items: menu.subs.map((sub) => ({ title: sub.name, url: sub.url })),
        }
      }),
    [user.access]
  )

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Leaf className="size-5 fill-emerald-500/20" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-foreground">Eduka</span>
                <span className="truncate text-xs text-muted-foreground">LMS dan CBT</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={[]} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}