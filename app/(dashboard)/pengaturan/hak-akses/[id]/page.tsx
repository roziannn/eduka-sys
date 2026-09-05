"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ChevronLeft,
  ShieldCheck,
  Save,
  ChevronDown,
  ChevronRight,
  Layers,
  MousePointerClick,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"

interface ButtonAccess {
  id: string
  name: string
  enabled: boolean
}

interface SubMenuAccess {
  id: string
  namaSubMenu: string
  url: string
  enabled: boolean
  buttons: ButtonAccess[]
}

interface MenuAccess {
  id: string
  namaMenu: string
  url: string
  enabled: boolean
  subMenus: SubMenuAccess[]
}

const initialAccessMatrix: MenuAccess[] = [
  {
    id: "m-1",
    namaMenu: "Dashboard",
    url: "/dashboard",
    enabled: true,
    subMenus: [],
  },
  {
    id: "m-2",
    namaMenu: "Ujian dan Kuis",
    url: "#",
    enabled: true,
    subMenus: [
      {
        id: "sm-1",
        namaSubMenu: "Soal Ujian",
        url: "/dashboard/soal-ujian",
        enabled: true,
        buttons: [
          { id: "b-1", name: "btn-add", enabled: true },
          { id: "b-2", name: "btn-edit", enabled: true },
          { id: "b-3", name: "btn-delete", enabled: false },
        ],
      },
      {
        id: "sm-2",
        namaSubMenu: "Soal Kuis",
        url: "/dashboard/soal-kuis",
        enabled: true,
        buttons: [
          { id: "b-4", name: "btn-add", enabled: true },
          { id: "b-5", name: "btn-publish", enabled: true },
        ],
      },
      {
        id: "sm-3",
        namaSubMenu: "Hasil Ujian",
        url: "/dashboard/hasil-ujian",
        enabled: true,
        buttons: [
          { id: "b-6", name: "btn-print", enabled: true },
          { id: "b-7", name: "btn-retake", enabled: false },
        ],
      },
    ],
  },
  {
    id: "m-3",
    namaMenu: "Pengaturan",
    url: "#",
    enabled: false,
    subMenus: [
      {
        id: "sm-5",
        namaSubMenu: "Menu Aplikasi",
        url: "/dashboard/pengaturan/menu-aplikasi",
        enabled: false,
        buttons: [
          { id: "b-8", name: "btn-save", enabled: false },
          { id: "b-9", name: "btn-add-sub", enabled: false },
        ],
      },
    ],
  },
]

export default function DetailHakAksesPage() {
  const params = useParams()
  const roleId = params?.id as string

  const [accessMatrix, setAccessMatrix] = React.useState<MenuAccess[]>(initialAccessMatrix)
  const [expandedRow, setExpandedRow] = React.useState<Record<string, boolean>>({
    "m-2": true,
    "m-3": true,
  })

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // --- TOGGLE HANDLERS ---
  const handleToggleMenu = (menuId: string) => {
    setAccessMatrix((prev) =>
      prev.map((menu) => {
        if (menu.id === menuId) {
          const nextState = !menu.enabled
          return {
            ...menu,
            enabled: nextState,
            // Jika Menu dimatikan, semua sub menu & button juga mati
            subMenus: menu.subMenus.map((sub) => ({
              ...sub,
              enabled: nextState,
              buttons: sub.buttons.map((b) => ({ ...b, enabled: nextState })),
            })),
          }
        }
        return menu
      })
    )
  }

  const handleToggleSubMenu = (menuId: string, subId: string) => {
    setAccessMatrix((prev) =>
      prev.map((menu) => {
        if (menu.id === menuId) {
          return {
            ...menu,
            subMenus: menu.subMenus.map((sub) => {
              if (sub.id === subId) {
                const nextState = !sub.enabled
                return {
                  ...sub,
                  enabled: nextState,
                  buttons: sub.buttons.map((b) => ({ ...b, enabled: nextState })),
                }
              }
              return sub
            }),
          }
        }
        return menu
      })
    )
  }

  const handleToggleButton = (menuId: string, subId: string, buttonId: string) => {
    setAccessMatrix((prev) =>
      prev.map((menu) => {
        if (menu.id === menuId) {
          return {
            ...menu,
            subMenus: menu.subMenus.map((sub) => {
              if (sub.id === subId) {
                return {
                  ...sub,
                  buttons: sub.buttons.map((b) => (b.id === buttonId ? { ...b, enabled: !b.enabled } : b)),
                }
              }
              return sub
            }),
          }
        }
        return menu
      })
    )
  }

  const handleSaveMatrix = () => {
    console.log("Akses disimpan untuk Role ID:", roleId, accessMatrix)
    alert("Izin hak akses berhasil diperbarui!")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Matriks Matriks Izin Akses
          </h1>
          <p className="text-sm text-muted-foreground">
            Pengaturan visibilitas menu dan fitur tombol untuk Role ID: <span className="font-semibold text-foreground">{roleId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/pengaturan/hak-akses">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </Link>
          <Button onClick={handleSaveMatrix}>
            <Save className="mr-2 h-4 w-4" /> Simpan Perubahan Akses
          </Button>
        </div>
      </div>

      {/* Tabel Matriks Matriks Akses */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[240px]">Menu / Sub Menu</TableHead>
              <TableHead className="w-[200px]">URL Rute</TableHead>
              <TableHead className="w-[100px]">Akses Menu</TableHead>
              <TableHead>Atur Akses Button</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accessMatrix.map((menu) => {
              const isExpanded = expandedRow[menu.id]
              const hasSub = menu.subMenus.length > 0

              return (
                <React.Fragment key={menu.id}>
                  {/* Baris Menu Utama */}
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell>
                      {hasSub && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleExpand(menu.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        <span>{menu.namaMenu}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{menu.url}</TableCell>
                    <TableCell>
                      <Switch checked={menu.enabled} onCheckedChange={() => handleToggleMenu(menu.id)} />
                    </TableCell>
                   
                  </TableRow>

                  {/* Baris Sub Menu */}
                  {isExpanded &&
                    menu.subMenus.map((sub) => (
                      <TableRow key={sub.id} className="hover:bg-muted/10 text-xs">
                        <TableCell></TableCell>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">└─</span>
                            <span className="font-medium text-foreground">{sub.namaSubMenu}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">{sub.url}</TableCell>
                        <TableCell>
                          <Switch
                            checked={sub.enabled}
                            disabled={!menu.enabled}
                            onCheckedChange={() => handleToggleSubMenu(menu.id, sub.id)}
                          />
                        </TableCell>

                        {/* TOGGLE ENABLE/DISABLE BUTTON PERMISSION */}
                        <TableCell>
                          <div className="flex flex-wrap gap-2 items-center">
                            {sub.buttons && sub.buttons.length > 0 ? (
                              sub.buttons.map((btn) => (
                                <div
                                  key={btn.id}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                                    btn.enabled && sub.enabled
                                      ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                                      : "bg-muted/40 border-border text-muted-foreground opacity-60"
                                  }`}
                                >
                                  <MousePointerClick className="h-3 w-3" />
                                  <span>{btn.name}</span>
                                  <Switch
                                    className="scale-75 origin-right"
                                    checked={btn.enabled}
                                    disabled={!sub.enabled || !menu.enabled}
                                    onCheckedChange={() => handleToggleButton(menu.id, sub.id, btn.id)}
                                  />
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">
                                - Tidak ada fitur button -
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}