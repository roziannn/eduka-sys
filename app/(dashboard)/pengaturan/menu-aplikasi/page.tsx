"use client"

import * as React from "react"
import {
  Plus,
  Pencil,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Search,
  Layers,
  MousePointerClick,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface SubMenuItem {
  id: string
  namaSubMenu: string
  url: string
  urutan: number
  isAktif: boolean
  buttons: string[]
}

interface MenuItem {
  id: string
  namaMenu: string
  iconName: string
  url: string
  urutan: number
  isAktif: boolean
  subMenus: SubMenuItem[]
}

const initialMenuItems: MenuItem[] = [
  {
    id: "m-1",
    namaMenu: "Dashboard",
    iconName: "LayoutDashboard",
    url: "/dashboard",
    urutan: 1,
    isAktif: true,
    subMenus: [],
  },
  {
    id: "m-2",
    namaMenu: "Ujian dan Kuis",
    iconName: "FileText",
    url: "#",
    urutan: 2,
    isAktif: true,
    subMenus: [
      { id: "sm-1", namaSubMenu: "Soal Ujian", url: "/dashboard/soal-ujian", urutan: 1, isAktif: true, buttons: ["btn-add", "btn-edit", "btn-delete"] },
      { id: "sm-2", namaSubMenu: "Soal Kuis", url: "/dashboard/soal-kuis", urutan: 2, isAktif: true, buttons: ["btn-add", "btn-publish"] },
      { id: "sm-3", namaSubMenu: "Hasil Ujian", url: "/dashboard/hasil-ujian", urutan: 3, isAktif: true, buttons: ["btn-print", "btn-retake"] },
    ],
  },
  {
    id: "m-3",
    namaMenu: "Pengaturan",
    iconName: "Sliders",
    url: "#",
    urutan: 3,
    isAktif: true,
    subMenus: [
      { id: "sm-5", namaSubMenu: "Menu Aplikasi", url: "/dashboard/pengaturan/menu-aplikasi", urutan: 1, isAktif: true, buttons: ["btn-save", "btn-add-sub"] },
    ],
  },
]

export default function MenuAplikasiPage() {
  const [menus, setMenus] = React.useState<MenuItem[]>(initialMenuItems)
  const [expandedRow, setExpandedRow] = React.useState<Record<string, boolean>>({
    "m-2": true,
    "m-3": true,
  })
  const [search, setSearch] = React.useState("")

  // Modal States
  const [openMenuModal, setOpenMenuModal] = React.useState(false)
  const [openSubMenuModal, setOpenSubMenuModal] = React.useState(false)
  
  // Target Parent Menu State
  const [activeParentMenu, setActiveParentMenu] = React.useState<MenuItem | null>(null)
  
  // Editing States
  const [editingMenu, setEditingMenu] = React.useState<MenuItem | null>(null)
  const [editingSubMenu, setEditingSubMenu] = React.useState<SubMenuItem | null>(null)

  // Forms
  const [formMenu, setFormMenu] = React.useState({
    namaMenu: "",
    url: "",
  })

  const [formSubMenu, setFormSubMenu] = React.useState({
    namaSubMenu: "",
    url: "",
  })

  // State List Button Action di Sub Menu
  const [buttonsList, setButtonsList] = React.useState<string[]>([])
  const [newButtonInput, setNewButtonInput] = React.useState("")

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // --- HANDLERS MENU UTAMA ---
  const handleOpenAddMenu = () => {
    setEditingMenu(null)
    setFormMenu({ namaMenu: "", url: "" })
    setOpenMenuModal(true)
  }

  const handleOpenEditMenu = (menu: MenuItem) => {
    setEditingMenu(menu)
    setFormMenu({ namaMenu: menu.namaMenu, url: menu.url })
    setOpenMenuModal(true)
  }

  const handleSaveMenu = () => {
    if (!formMenu.namaMenu) return

    if (editingMenu) {
      setMenus((prev) =>
        prev.map((item) =>
          item.id === editingMenu.id
            ? { ...item, namaMenu: formMenu.namaMenu, url: formMenu.url }
            : item
        )
      )
    } else {
      const newMenu: MenuItem = {
        id: `m-${Date.now()}`,
        namaMenu: formMenu.namaMenu,
        iconName: "Folder",
        url: formMenu.url || "#",
        urutan: menus.length + 1,
        isAktif: true,
        subMenus: [],
      }
      setMenus((prev) => [...prev, newMenu])
    }
    setOpenMenuModal(false)
  }

  // --- HANDLERS SUB MENU ---
  const handleOpenAddSubMenu = (parentMenu: MenuItem) => {
    setEditingSubMenu(null)
    setActiveParentMenu(parentMenu)
    setFormSubMenu({ namaSubMenu: "", url: "" })
    setButtonsList([])
    setNewButtonInput("")
    setOpenSubMenuModal(true)
  }

  const handleOpenEditSubMenu = (parentMenu: MenuItem, subMenu: SubMenuItem) => {
    setEditingSubMenu(subMenu)
    setActiveParentMenu(parentMenu)
    setFormSubMenu({ namaSubMenu: subMenu.namaSubMenu, url: subMenu.url })
    setButtonsList(subMenu.buttons || [])
    setNewButtonInput("")
    setOpenSubMenuModal(true)
  }

  // Tag Button Handlers
  const handleAddButtonTag = () => {
    if (!newButtonInput.trim()) return
    const formatted = newButtonInput.trim().toLowerCase().replace(/\s+/g, "-")
    if (!buttonsList.includes(formatted)) {
      setButtonsList([...buttonsList, formatted])
    }
    setNewButtonInput("")
  }

  const handleRemoveButtonTag = (btnName: string) => {
    setButtonsList(buttonsList.filter((b) => b !== btnName))
  }

  const handleSaveSubMenu = () => {
    if (!formSubMenu.namaSubMenu || !activeParentMenu) return

    if (editingSubMenu) {
      setMenus((prev) =>
        prev.map((menu) => {
          if (menu.id === activeParentMenu.id) {
            return {
              ...menu,
              subMenus: menu.subMenus.map((sub) =>
                sub.id === editingSubMenu.id
                  ? {
                      ...sub,
                      namaSubMenu: formSubMenu.namaSubMenu,
                      url: formSubMenu.url,
                      buttons: buttonsList,
                    }
                  : sub
              ),
            }
          }
          return menu
        })
      )
    } else {
      setMenus((prev) =>
        prev.map((menu) => {
          if (menu.id === activeParentMenu.id) {
            const newSub: SubMenuItem = {
              id: `sm-${Date.now()}`,
              namaSubMenu: formSubMenu.namaSubMenu,
              url: formSubMenu.url,
              urutan: menu.subMenus.length + 1,
              isAktif: true,
              buttons: buttonsList,
            }
            return {
              ...menu,
              subMenus: [...menu.subMenus, newSub],
            }
          }
          return menu
        })
      )
      setExpandedRow((prev) => ({ ...prev, [activeParentMenu.id]: true }))
    }
    setOpenSubMenuModal(false)
  }

  // Filter Search
  const filteredMenus = React.useMemo(() => {
    if (!search) return menus
    return menus.filter(
      (m) =>
        m.namaMenu.toLowerCase().includes(search.toLowerCase()) ||
        m.subMenus.some((s) => s.namaSubMenu.toLowerCase().includes(search.toLowerCase()))
    )
  }, [menus, search])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Pengaturan Menu Aplikasi
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola hierarki menu navigasi sidebar, sub menu, serta tombol aksi (button permissions).
          </p>
        </div>

        <Button onClick={handleOpenAddMenu}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Menu Utama
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari menu atau sub menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">Total: {menus.length} Menu Utama</span>
      </div>

      {/* Main Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[70px]">No</TableHead>
              <TableHead className="w-[240px]">Nama Menu / Sub Menu</TableHead>
              <TableHead className="w-[200px]">URL Rute</TableHead>
              <TableHead>Fitur Button Action</TableHead>
              <TableHead className="text-right w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMenus.length ? (
              filteredMenus.map((menu) => {
                const isExpanded = expandedRow[menu.id]
                const hasSub = menu.subMenus.length > 0

                return (
                  <React.Fragment key={menu.id}>
                    {/* Baris Menu Utama */}
                    <TableRow className="bg-muted/20 hover:bg-muted/40 font-medium">
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
                      <TableCell className="font-mono text-xs">{menu.urutan}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          <span>{menu.namaMenu}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{menu.url}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {menu.subMenus.length} Sub Menu
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary"
                            title="Tambah Sub Menu Ke Sini"
                            onClick={() => handleOpenAddSubMenu(menu)}
                          >
                            <FolderPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Edit Menu"
                            onClick={() => handleOpenEditMenu(menu)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Baris Sub Menu */}
                    {isExpanded &&
                      menu.subMenus.map((sub) => (
                        <TableRow key={sub.id} className="hover:bg-muted/10 text-xs">
                          <TableCell></TableCell>
                          <TableCell className="font-mono text-muted-foreground">{sub.urutan}</TableCell>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">└─</span>
                              <span className="font-medium text-foreground">{sub.namaSubMenu}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">{sub.url}</TableCell>
                          
                          {/* LIST BADGE BUTTON ACTION */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {sub.buttons && sub.buttons.length > 0 ? (
                                sub.buttons.map((btn, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-[10px] font-mono gap-1 bg-muted/80 text-foreground border"
                                  >
                                    <MousePointerClick className="h-2.5 w-2.5 text-primary" />
                                    {btn}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground italic text-[11px]">- Tidak ada button -</span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Edit Sub Menu"
                                onClick={() => handleOpenEditSubMenu(menu, sub)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </React.Fragment>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Data menu aplikasi tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG FORM MENU UTAMA */}
      <Dialog open={openMenuModal} onOpenChange={setOpenMenuModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingMenu ? "Edit Menu Utama" : "Tambah Menu Utama Baru"}</DialogTitle>
            <DialogDescription>
              Isi data kelompok menu induk untuk navigasi sidebar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label>Nama Menu Utama</Label>
              <Input
                placeholder="Contoh: Pengaturan, Ujian dan Kuis"
                value={formMenu.namaMenu}
                onChange={(e) => setFormMenu({ ...formMenu, namaMenu: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL Rute / Halaman (Opsional)</Label>
              <Input
                placeholder="Isi '#' jika menu ini memiliki sub menu"
                value={formMenu.url}
                onChange={(e) => setFormMenu({ ...formMenu, url: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMenuModal(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMenu}>Simpan Menu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG FORM SUB MENU */}
      <Dialog open={openSubMenuModal} onOpenChange={setOpenSubMenuModal}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingSubMenu ? "Edit Sub Menu" : "Tambah Sub Menu"}</DialogTitle>
            <DialogDescription>
              Menambahkan sub menu untuk menu induk:{" "}
              <strong className="text-foreground font-semibold">{activeParentMenu?.namaMenu}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="bg-muted/50 p-2.5 rounded-md border text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Menu Induk Target:</span>
              <Badge variant="secondary" className="font-semibold">{activeParentMenu?.namaMenu}</Badge>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Sub Menu</Label>
              <Input
                placeholder="Contoh: Menu Aplikasi, Soal Ujian"
                value={formSubMenu.namaSubMenu}
                onChange={(e) => setFormSubMenu({ ...formSubMenu, namaSubMenu: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL Rute Halaman</Label>
              <Input
                placeholder="Contoh: /dashboard/pengaturan/menu-aplikasi"
                value={formSubMenu.url}
                onChange={(e) => setFormSubMenu({ ...formSubMenu, url: e.target.value })}
              />
            </div>

            {/* DAFTAR BUTTON ACTION */}
            <div className="space-y-2 pt-1">
              <Label className="flex items-center justify-between">
                <span>Daftar Button Action (Permissions)</span>
                <span className="text-[11px] text-muted-foreground font-normal">Tekan Enter atau klik Tambah</span>
              </Label>

              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: btn-save, btn-delete"
                  value={newButtonInput}
                  onChange={(e) => setNewButtonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddButtonTag()
                    }
                  }}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="secondary" onClick={handleAddButtonTag}>
                  Tambah
                </Button>
              </div>

              {/* Tag Render Button List */}
              <div className="flex flex-wrap gap-1.5 pt-1 min-h-[36px] bg-muted/20 p-2 rounded-md border">
                {buttonsList.length > 0 ? (
                  buttonsList.map((btn, i) => (
                    <Badge
                      key={i}
                      variant="default"
                      className="gap-1 font-mono text-[11px] bg-primary text-primary-foreground pr-1"
                    >
                      {btn}
                      <button
                        type="button"
                        onClick={() => handleRemoveButtonTag(btn)}
                        className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic my-auto">
                    Belum ada button action ditambahkan.
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSubMenuModal(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveSubMenu}>Simpan Sub Menu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}