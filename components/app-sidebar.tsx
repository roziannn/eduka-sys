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
import {
  LayoutDashboardIcon,
  DatabaseIcon,
  FileCheck2Icon,
  Settings2,
  Leaf,
} from "lucide-react"

type SidebarUser = {
  name: string
  email: string
  avatar: string
}

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      isActive: true,
    },
    {
      title: "Master Data",
      url: "#",
      icon: <DatabaseIcon />,
      items: [
        {
          title: "Tahun Ajaran",
          url: "/dashboard/master/tahun-ajaran",
        },
        {
          title: "Mata Pelajaran",
          url: "/dashboard/master/mata-pelajaran",
        },
        {
          title: "Data Kelas",
          url: "/dashboard/master/data-kelas",
        },
        {
          title: "Data Pengguna",
          url: "/dashboard/master/data-pengguna",
        },
        {
          title: "Template e-Rapor",
          url: "/dashboard/master/template-rapor",
        },
      ],
    },
    {
      title: "Ujian dan Kuis",
      url: "#",
      icon: <FileCheck2Icon />,
      items: [
        {
          title: "Soal Ujian",
          url: "/dashboard/soal-ujian",
        },
        {
          title: "Soal Kuis",
          url: "/dashboard/soal-kuis",
        },
        {
          title: "Hasil Ujian",
          url: "/dashboard/hasil-ujian",
        },
        {
          title: "Hasil Kuis",
          url: "/dashboard/hasil-kuis",
        },
      ],
    },
    {
      title: "Pengaturan",
      url: "#",
      icon: <Settings2 />,
      items: [
        {
          title: "Akun Pengguna",
          url: "/pengaturan/akun-pengguna",
        },
        {
          title: "Hak Akses",
          url: "/pengaturan/hak-akses",
        },
        {
          title: "Menu Aplikasi",
          url: "/pengaturan/menu-aplikasi",
        },
      ],
    },
  ],
  navSecondary: [],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
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
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}