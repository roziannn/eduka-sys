"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ChevronLeft,
  ShieldCheck,
  Save,
  ChevronDown,
  ChevronRight,
  Layers,
  MousePointerClick,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

interface ButtonAccess {
  id: string
  code: string
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

// Bentuk data dari GET /api/roles/[id]/access
interface RoleAccessData {
  role: { id: string; code: string; name: string }
  menus: MenuAccess[]
}

export default function DetailHakAksesPage() {
  const params = useParams()
  const roleId = params?.id as string

  const queryClient = useQueryClient()
  const accessKey = ["role-access", roleId]

  const { data, isLoading, error } = useQuery<RoleAccessData>({
    queryKey: accessKey,
    queryFn: () => fetchJson<RoleAccessData>(`/api/roles/${roleId}/access`),
    enabled: Boolean(roleId),
  })

  const [accessMatrix, setAccessMatrix] = React.useState<MenuAccess[]>([])
  const [expandedRow, setExpandedRow] = React.useState<Record<string, boolean>>({})

  // Isi matriks dari server setiap kali data baru datang (pertama kali dan setelah simpan)
  const expandedInitialized = React.useRef(false)
  React.useEffect(() => {
    if (!data) return
    setAccessMatrix(data.menus)
    if (!expandedInitialized.current) {
      expandedInitialized.current = true
      setExpandedRow(
        Object.fromEntries(data.menus.filter((m) => m.subMenus.length > 0).map((m) => [m.id, true]))
      )
    }
  }, [data])

  React.useEffect(() => {
    if (error) toast.error(`Gagal memuat hak akses: ${getErrorMessage(error)}`)
  }, [error])

  const saveMutation = useMutation({
    mutationFn: (body: { menuIds: string[]; functionIds: string[] }) =>
      fetchJson(`/api/roles/${roleId}/access`, { method: "PUT", body }),
    onSuccess: () => {
      toast.success("Izin hak akses berhasil diperbarui!")
      return queryClient.invalidateQueries({ queryKey: accessKey })
    },
    onError: (err) => toast.error(`Gagal menyimpan hak akses: ${getErrorMessage(err)}`),
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
    const menuIds: string[] = []
    const functionIds: string[] = []
    for (const menu of accessMatrix) {
      if (menu.enabled) menuIds.push(menu.id)
      for (const sub of menu.subMenus) {
        if (sub.enabled) menuIds.push(sub.id)
        for (const btn of sub.buttons) {
          if (btn.enabled) functionIds.push(btn.id)
        }
      }
    }
    saveMutation.mutate({ menuIds, functionIds })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Matriks Izin Akses
          </h1>
          <p className="text-sm text-muted-foreground">
            Pengaturan visibilitas menu dan fitur tombol untuk Role: <span className="font-semibold text-foreground">{data?.role.name ?? "..."}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/pengaturan/hak-akses">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </Link>
          <Button onClick={handleSaveMatrix} disabled={isLoading || !data || saveMutation.isPending}>
            {saveMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Simpan Perubahan Akses</>
            )}
          </Button>
        </div>
      </div>

      {/* Tabel Matriks Akses */}
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : accessMatrix.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Belum ada menu.
                </TableCell>
              </TableRow>
            ) : null}
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
                            disabled={!menu.enabled || saveMutation.isPending}
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
                                  <span>{btn.code}</span>
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