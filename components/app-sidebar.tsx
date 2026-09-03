"use client"

import * as React from "react"
import Image from "next/image"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
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
  GraduationCapIcon,
  HelpCircleIcon,
  FileCheck2Icon,
  ClipboardListIcon,
  FileTextIcon,
  LifeBuoyIcon,
  SendIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  UsersIcon,
  UserCheckIcon,
  SparklesIcon,
} from "lucide-react"

const data = {
  user: {
    name: "Admin Eduka",
    email: "admin@eduka.id",
    avatar: "/avatars/admin.jpg",
  },
  // Menu Utama Navigasi LMS
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
          title: "Template Rapor",
          url: "/dashboard/master/template-rapor",
        },
      ],
    },
    // {
    //   title: "Manajemen Akademik",
    //   url: "#",
    //   icon: <GraduationCapIcon />,
    //   items: [
    //     {
    //       title: "Penugasan Guru",
    //       url: "/dashboard/manajemen-akademik/penugasan-guru",
    //     },
    //     {
    //       title: "Rombel & Enrollment",
    //       url: "/dashboard/manajemen-akademik/rombel-enrollment",
    //     },
    //     {
    //       title: "Wali Kelas",
    //       url: "/dashboard/manajemen-akademik/wali-kelas",
    //     },
    //   ],
    // },
    {
    title: "Ujian & Kuis",
    url: "#",
    icon: <FileCheck2Icon />,
    items: [
      {
        title: "Soal Ujian",
        url: "/dashboard/soal-ujian",
      },
       {
        title: "Soal Kuis",
        url: "/dashboard/ujian/kuis",
      },
      {
        title: "Jadwal UTS & UAS",
        url: "/dashboard/ujian/jadwal-uts-uas",
      },
      {
        title: "Jadwal Kuis Harian",
        url: "/dashboard/ujian/jadwal-kuis",
      },
      {
        title: "Koreksi UTS & UAS",
        url: "/dashboard/ujian/koreksi-uts-uas",
      },
      {
        title: "Koreksi Kuis",
        url: "/dashboard/ujian/koreksi-kuis",
      },
    ],
  },
    // {
    //   title: "Rapor Siswa",
    //   url: "/dashboard/rapor-siswa",
    //   icon: <FileTextIcon />,
    // },
  ],
  // Shortcut Menu Cepat
  projects: [
    // {
    //   name: "Jadwal Mengajar",
    //   url: "/dashboard/jadwal",
    //   icon: <CalendarDaysIcon />,
    // },
    // {
    //   name: "Rekap Kehadiran",
    //   url: "/dashboard/rekap-absensi",
    //   icon: <ClipboardListIcon />,
    // },
    // {
    //   name: "Panduan Penggunaan",
    //   url: "/dashboard/panduan",
    //   icon: <BookOpenIcon />,
    // },
  ],
  navSecondary: [
    // {
    //   title: "Bantuan",
    //   url: "#",
    //   icon: <LifeBuoyIcon />,
    // },
    // {
    //   title: "Kirim Masukan",
    //   url: "#",
    //   icon: <SendIcon />,
    // },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Image
                  src="/logo/eduka.png"
                  alt="Eduka"
                  width={24}
                  height={24}
                  className="h-5 w-auto object-contain"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-foreground">Eduka</span>
                <span className="truncate text-xs text-muted-foreground">LMS & Academic</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}