"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  // Helper untuk mengecek apakah URL cocok persis atau merupakan child route
  const checkIsActive = (url: string) => {
    if (!url || url === "#") return false
    if (url === "/dashboard") return pathname === "/dashboard"
    return pathname === url || pathname.startsWith(`${url}/`)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // Cek apakah halaman aktif cocok dengan item induk atau salah satu sub-item
          const isSubActive = item.items?.some((subItem) =>
            checkIsActive(subItem.url)
          )
          const isMainActive = checkIsActive(item.url) || isSubActive

          return (
            <Collapsible
              key={item.title}
              defaultOpen={isMainActive}
              render={<SidebarMenuItem />}
            >
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isMainActive}
                render={<Link href={item.url} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>

              {item.items?.length ? (
                <>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuAction className="aria-expanded:rotate-90" />
                    }
                  >
                    <ChevronRightIcon />
                    <span className="sr-only">Toggle</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const isChildActive = checkIsActive(subItem.url)

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              isActive={isChildActive}
                              render={<Link href={subItem.url} />}
                            >
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}