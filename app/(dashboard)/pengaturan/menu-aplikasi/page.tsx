"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Search,
  Layers,
  MousePointerClick,
  Trash2,
  Check,
  X,
  Loader2,
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
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"
import { isMenuIconName, MENU_ICON_NAMES } from "@/lib/menu-icon-names"
import { getMenuIcon, MENU_ICONS } from "@/lib/menu-icons"

// Bentuk data dari GET /api/menu
interface SubMenuItem {
  id: string
  namaSubMenu: string
  url: string
  sequence: number
  isAktif: boolean
  buttons: { id: string; code: string }[]
}

interface MenuItem {
  id: string
  namaMenu: string
  iconName: string | null
  url: string
  sequence: number
  isAktif: boolean
  subMenus: SubMenuItem[]
}

// Button di dialog sub menu. id null = button baru yang belum tersimpan.
interface ButtonDraft {
  id: string | null
  code: string
}

const MENU_KEY = ["menu"]

const BUTTON_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const MAX_BUTTON_CODE = 50

// Sama dengan aturan di server: huruf kecil, spasi jadi tanda minus
const normalizeCode = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, "-")

// Mengembalikan pesan error, atau null kalau kode valid. `others` = kode button lain di daftar.
const validateCode = (code: string, others: string[]) => {
  if (!code) return "Kode button wajib diisi."
  if (code.length > MAX_BUTTON_CODE) return `Kode button maksimal ${MAX_BUTTON_CODE} karakter.`
  if (!BUTTON_RE.test(code)) return "Pakai huruf kecil, angka, dan tanda minus. Contoh: btn-create."
  if (others.includes(code)) return `Button "${code}" sudah ada di daftar.`
  return null
}

const MAX_SEQUENCE = 9999

// Isian urutan: kosong = otomatis paling akhir (saat tambah) atau tidak diubah (saat edit)
const parseSequence = (raw: string): { value: number | null; error: string | null } => {
  const text = raw.trim()
  if (!text) return { value: null, error: null }
  const n = Number(text)
  if (!Number.isInteger(n) || n < 1 || n > MAX_SEQUENCE) {
    return { value: null, error: `Urutan harus bilangan bulat antara 1 sampai ${MAX_SEQUENCE}.` }
  }
  return { value: n, error: null }
}

export default function MenuAplikasiPage() {
  const queryClient = useQueryClient()

  const [expandedRow, setExpandedRow] = React.useState<Record<string, boolean>>({})
  const [search, setSearch] = React.useState("")
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Modal States
  const [openMenuModal, setOpenMenuModal] = React.useState(false)
  const [openSubMenuModal, setOpenSubMenuModal] = React.useState(false)

  // Target Parent Menu State
  const [activeParentMenu, setActiveParentMenu] = React.useState<MenuItem | null>(null)

  // Editing States
  const [editingMenu, setEditingMenu] = React.useState<MenuItem | null>(null)
  const [editingSubMenu, setEditingSubMenu] = React.useState<SubMenuItem | null>(null)

  // Forms. iconName "" = tanpa ikon.
  const [formMenu, setFormMenu] = React.useState({
    namaMenu: "",
    url: "",
    iconName: "",
    sequence: "",
  })

  const [formSubMenu, setFormSubMenu] = React.useState({
    namaSubMenu: "",
    url: "",
    sequence: "",
  })

  // State List Button Action di Sub Menu
  const [buttonsList, setButtonsList] = React.useState<ButtonDraft[]>([])
  const [newButtonInput, setNewButtonInput] = React.useState("")
  const [buttonError, setButtonError] = React.useState<string | null>(null)
  // Button yang sedang diedit di tempat (indeks di buttonsList), null = tidak ada
  const [editingButtonIndex, setEditingButtonIndex] = React.useState<number | null>(null)
  const [editingButtonValue, setEditingButtonValue] = React.useState("")

  // ---------- DATA ----------
  const {
    data: menus = [],
    isLoading,
    error: menusError,
  } = useQuery<MenuItem[]>({
    queryKey: MENU_KEY,
    queryFn: () => fetchJson<MenuItem[]>("/api/menu"),
  })

  React.useEffect(() => {
    if (menusError) {
      toast.error(`Gagal memuat data menu: ${getErrorMessage(menusError)}`)
    }
  }, [menusError])

  // Saat pertama dimuat, semua menu utama yang punya sub menu dibuka
  const expandedInitialized = React.useRef(false)
  React.useEffect(() => {
    if (expandedInitialized.current || menus.length === 0) return
    expandedInitialized.current = true

    setExpandedRow(
      Object.fromEntries(menus.filter((m) => m.subMenus.length > 0).map((m) => [m.id, true]))
    )
  }, [menus])

  // Satu mutation untuk menu utama dan sub menu (bedanya di isi body)
  const saveMutation = useMutation({
    mutationFn: (input: { id?: string; body: Record<string, unknown> }) =>
      fetchJson(input.id ? `/api/menu/${input.id}` : "/api/menu", {
        method: input.id ? "PUT" : "POST",
        body: input.body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MENU_KEY }),
  })

  const isSaving = saveMutation.isPending

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // --- HANDLERS MENU UTAMA ---
  const handleOpenAddMenu = () => {
    setEditingMenu(null)
    setErrorMsg(null)
    setFormMenu({ namaMenu: "", url: "", iconName: "", sequence: "" })
    setOpenMenuModal(true)
  }

  const handleOpenEditMenu = (menu: MenuItem) => {
    setEditingMenu(menu)
    setErrorMsg(null)
    setFormMenu({
      namaMenu: menu.namaMenu,
      url: menu.url,
      // Ikon di luar daftar yang tersedia dianggap kosong (akan dihapus kalau disimpan)
      iconName: isMenuIconName(menu.iconName) ? menu.iconName : "",
      sequence: String(menu.sequence),
    })
    setOpenMenuModal(true)
  }

  const handleSaveMenu = () => {
    const nama = formMenu.namaMenu.trim()
    if (!nama) {
      setErrorMsg("Nama menu utama wajib diisi.")
      return
    }
    const sequence = parseSequence(formMenu.sequence)
    if (sequence.error) {
      setErrorMsg(sequence.error)
      return
    }
    setErrorMsg(null)

    const isEdit = Boolean(editingMenu)

    // Button tidak dikirim untuk menu utama, jadi tidak ikut diubah
    saveMutation.mutate(
      {
        id: editingMenu?.id,
        body: {
          nama,
          url: formMenu.url,
          icon: formMenu.iconName || null,
          sequence: sequence.value,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            isEdit ? "Menu utama berhasil diperbarui!" : `Menu "${nama}" berhasil ditambahkan!`
          )
          setOpenMenuModal(false)
        },
        onError: (err) => {
          const message = getErrorMessage(err)
          setErrorMsg(message)
          toast.error(`${isEdit ? "Gagal memperbarui" : "Gagal menambah"} menu: ${message}`)
        },
      }
    )
  }

  // --- HANDLERS SUB MENU ---
  const resetButtonEditor = () => {
    setNewButtonInput("")
    setButtonError(null)
    setEditingButtonIndex(null)
    setEditingButtonValue("")
  }

  const handleOpenAddSubMenu = (parentMenu: MenuItem) => {
    setEditingSubMenu(null)
    setActiveParentMenu(parentMenu)
    setErrorMsg(null)
    setFormSubMenu({ namaSubMenu: "", url: "", sequence: "" })
    setButtonsList([])
    resetButtonEditor()
    setOpenSubMenuModal(true)
  }

  const handleOpenEditSubMenu = (parentMenu: MenuItem, subMenu: SubMenuItem) => {
    setEditingSubMenu(subMenu)
    setActiveParentMenu(parentMenu)
    setErrorMsg(null)
    setFormSubMenu({
      namaSubMenu: subMenu.namaSubMenu,
      url: subMenu.url,
      sequence: String(subMenu.sequence),
    })
    setButtonsList(subMenu.buttons.map((b) => ({ id: b.id, code: b.code })))
    resetButtonEditor()
    setOpenSubMenuModal(true)
  }

  // Tambah button
  const handleAddButton = () => {
    if (!newButtonInput.trim()) return

    const code = normalizeCode(newButtonInput)
    const error = validateCode(code, buttonsList.map((b) => b.code))
    if (error) {
      setButtonError(error)
      return
    }

    setButtonsList((prev) => [...prev, { id: null, code }])
    setNewButtonInput("")
    setButtonError(null)
  }

  // Edit button di tempat. id button tetap, hanya kodenya yang berubah.
  const handleStartEditButton = (index: number) => {
    setEditingButtonIndex(index)
    setEditingButtonValue(buttonsList[index].code)
    setButtonError(null)
  }

  const handleConfirmEditButton = () => {
    if (editingButtonIndex === null) return

    const code = normalizeCode(editingButtonValue)
    const others = buttonsList.filter((_, i) => i !== editingButtonIndex).map((b) => b.code)
    const error = validateCode(code, others)
    if (error) {
      setButtonError(error)
      return
    }

    setButtonsList((prev) =>
      prev.map((b, i) => (i === editingButtonIndex ? { ...b, code } : b))
    )
    setEditingButtonIndex(null)
    setEditingButtonValue("")
    setButtonError(null)
  }

  const handleCancelEditButton = () => {
    setEditingButtonIndex(null)
    setEditingButtonValue("")
    setButtonError(null)
  }

  // Hapus button dari daftar. Baru berlaku saat sub menu disimpan.
  const handleRemoveButton = (index: number) => {
    setButtonsList((prev) => prev.filter((_, i) => i !== index))
    setButtonError(null)
  }

  const handleSaveSubMenu = () => {
    if (!activeParentMenu) return

    const nama = formSubMenu.namaSubMenu.trim()
    if (!nama) {
      setErrorMsg("Nama sub menu wajib diisi.")
      return
    }
    if (!formSubMenu.url.trim()) {
      setErrorMsg("URL rute halaman wajib diisi.")
      return
    }
    const sequence = parseSequence(formSubMenu.sequence)
    if (sequence.error) {
      setErrorMsg(sequence.error)
      return
    }
    if (editingButtonIndex !== null) {
      setErrorMsg("Selesaikan atau batalkan edit button terlebih dahulu.")
      return
    }
    if (newButtonInput.trim()) {
      setErrorMsg(
        `Button "${newButtonInput.trim()}" belum ditambahkan. Klik Tambah atau kosongkan kolomnya.`
      )
      return
    }
    setErrorMsg(null)

    const isEdit = Boolean(editingSubMenu)
    const parent = activeParentMenu

    saveMutation.mutate(
      {
        id: editingSubMenu?.id,
        body: {
          // Menu induk hanya dikirim saat membuat, tidak bisa dipindah saat edit
          ...(isEdit ? {} : { parentId: parent.id }),
          nama,
          url: formSubMenu.url,
          sequence: sequence.value,
          buttons: buttonsList.map(({ id, code }) => ({ id, code })),
        },
      },
      {
        onSuccess: () => {
          toast.success(
            isEdit ? "Sub menu berhasil diperbarui!" : `Sub menu "${nama}" berhasil ditambahkan!`
          )
          if (!isEdit) setExpandedRow((prev) => ({ ...prev, [parent.id]: true }))
          setOpenSubMenuModal(false)
        },
        onError: (err) => {
          const message = getErrorMessage(err)
          setErrorMsg(message)
          toast.error(`${isEdit ? "Gagal memperbarui" : "Gagal menambah"} sub menu: ${message}`)
        },
      }
    )
  }

  // Filter Search
  const filteredMenus = React.useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return menus

    return menus.filter(
      (m) =>
        m.namaMenu.toLowerCase().includes(keyword) ||
        m.subMenus.some((s) => s.namaSubMenu.toLowerCase().includes(keyword))
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
              <TableHead className="w-[240px]">Nama Menu</TableHead>
              <TableHead className="w-[200px]">URL Rute</TableHead>
              <TableHead>Fitur Button Action</TableHead>
              <TableHead className="text-right w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredMenus.length ? (
              filteredMenus.map((menu) => {
                const isExpanded = expandedRow[menu.id]
                const hasSub = menu.subMenus.length > 0
                // Ikon yang dipilih, atau Layers kalau menu belum punya ikon
                const MenuIcon = getMenuIcon(menu.iconName) ?? Layers

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
                      <TableCell className="text-sm">{menu.sequence}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <MenuIcon className="h-4 w-4 text-primary" />
                          <span>{menu.namaMenu}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{menu.url}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
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
                          <TableCell className="font-mono text-muted-foreground">{sub.sequence}</TableCell>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">└─</span>
                              <span className="font-medium text-foreground">{sub.namaSubMenu}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{sub.url}</TableCell>

                          {/* LIST BADGE BUTTON ACTION */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {sub.buttons.length > 0 ? (
                                sub.buttons.map((btn) => (
                                  <Badge
                                    key={btn.id}
                                    variant="secondary"
                                    className="text-[10px] font-mono gap-1 bg-muted/80 text-foreground border"
                                  >
                                    <MousePointerClick className="h-2.5 w-2.5 text-primary" />
                                    {btn.code}
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
                  {menus.length === 0
                    ? "Belum ada menu. Klik Tambah Menu Utama untuk memulai."
                    : "Data menu aplikasi tidak ditemukan."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG FORM MENU UTAMA */}
      <Dialog
        open={openMenuModal}
        onOpenChange={(open) => {
          // Dialog tidak bisa ditutup selagi menyimpan
          if (!open && !isSaving) setOpenMenuModal(false)
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingMenu ? "Edit Menu Utama" : "Tambah Menu Utama Baru"}</DialogTitle>
            <DialogDescription>
              Isi data kelompok menu induk untuk navigasi sidebar.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive font-medium text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label>Nama Menu Utama</Label>
              <Input
                placeholder="Contoh: Pengaturan, Ujian dan Kuis"
                value={formMenu.namaMenu}
                maxLength={100}
                disabled={isSaving}
                onChange={(e) => setFormMenu({ ...formMenu, namaMenu: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL Rute / Halaman (Opsional)</Label>
              <Input
                placeholder="Isi '#' jika menu ini memiliki sub menu"
                value={formMenu.url}
                disabled={isSaving}
                onChange={(e) => setFormMenu({ ...formMenu, url: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Urutan di Sidebar (Opsional)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_SEQUENCE}
                step={1}
                placeholder={editingMenu ? "Kosongkan jika tidak diubah" : "Kosongkan untuk taruh paling akhir"}
                value={formMenu.sequence}
                disabled={isSaving}
                onChange={(e) => setFormMenu({ ...formMenu, sequence: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ikon (Opsional)</Label>
              <IconPicker
                value={formMenu.iconName}
                disabled={isSaving}
                onChange={(iconName) => setFormMenu({ ...formMenu, iconName })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMenuModal(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button onClick={handleSaveMenu} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : (
                "Simpan Menu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG FORM SUB MENU */}
      <Dialog
        open={openSubMenuModal}
        onOpenChange={(open) => {
          if (!open && !isSaving) setOpenSubMenuModal(false)
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingSubMenu ? "Edit Sub Menu" : "Tambah Sub Menu"}</DialogTitle>
            <DialogDescription>
              {editingSubMenu ? "Mengubah sub menu dari menu induk: " : "Menambahkan sub menu untuk menu induk: "}
              <strong className="text-foreground font-semibold">{activeParentMenu?.namaMenu}</strong>
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive font-medium text-center">
              {errorMsg}
            </div>
          )}

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
                maxLength={100}
                disabled={isSaving}
                onChange={(e) => setFormSubMenu({ ...formSubMenu, namaSubMenu: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL Rute Halaman</Label>
              <Input
                placeholder="Contoh: /dashboard/pengaturan/menu-aplikasi"
                value={formSubMenu.url}
                disabled={isSaving}
                onChange={(e) => setFormSubMenu({ ...formSubMenu, url: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Urutan di Sidebar (Opsional)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_SEQUENCE}
                step={1}
                placeholder={editingSubMenu ? "Kosongkan jika tidak diubah" : "Kosongkan untuk taruh paling akhir"}
                value={formSubMenu.sequence}
                disabled={isSaving}
                onChange={(e) => setFormSubMenu({ ...formSubMenu, sequence: e.target.value })}
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
                  placeholder="Contoh: btn-create, btn-edit, btn-view"
                  value={newButtonInput}
                  disabled={isSaving || editingButtonIndex !== null}
                  onChange={(e) => {
                    setNewButtonInput(e.target.value)
                    setButtonError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddButton()
                    }
                  }}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddButton}
                  disabled={isSaving || editingButtonIndex !== null}
                >
                  Tambah
                </Button>
              </div>

              {buttonError && <p className="text-xs text-destructive">{buttonError}</p>}

              {/* Daftar button: tiap baris bisa diedit atau dihapus */}
              <div className="space-y-1.5 min-h-[44px] max-h-[200px] overflow-y-auto bg-muted/20 p-2 rounded-md border">
                {buttonsList.length === 0 ? (
                  <span className="block py-1 text-xs text-muted-foreground italic">
                    Belum ada button action ditambahkan.
                  </span>
                ) : (
                  buttonsList.map((btn, i) =>
                    editingButtonIndex === i ? (
                      <div key={btn.id ?? `baru-${i}`} className="flex items-center gap-1.5">
                        <Input
                          autoFocus
                          value={editingButtonValue}
                          disabled={isSaving}
                          onChange={(e) => {
                            setEditingButtonValue(e.target.value)
                            setButtonError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleConfirmEditButton()
                            }
                            if (e.key === "Escape") {
                              e.preventDefault()
                              e.stopPropagation()
                              handleCancelEditButton()
                            }
                          }}
                          className="h-8 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-emerald-600"
                          title="Simpan perubahan button"
                          onClick={handleConfirmEditButton}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Batal"
                          onClick={handleCancelEditButton}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        key={btn.id ?? `baru-${i}`}
                        className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1"
                      >
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <MousePointerClick className="h-3 w-3 text-primary" />
                          {btn.code}
                          {btn.id === null && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 font-sans">
                              baru
                            </Badge>
                          )}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            title="Edit button"
                            disabled={isSaving || editingButtonIndex !== null}
                            onClick={() => handleStartEditButton(i)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            title="Hapus button"
                            disabled={isSaving || editingButtonIndex !== null}
                            onClick={() => handleRemoveButton(i)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">
                Perubahan button (tambah, edit, hapus) baru tersimpan setelah klik Simpan Sub Menu.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSubMenuModal(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button onClick={handleSaveSubMenu} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : (
                "Simpan Sub Menu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Pilihan ikon menu utama. Klik ikon yang sedang dipilih (atau "Hapus ikon") untuk mengosongkan.
function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="grid max-h-[150px] grid-cols-8 gap-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2">
        {MENU_ICON_NAMES.map((name) => {
          const Icon = MENU_ICONS[name]
          const selected = value === name

          return (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? "" : name)}
              className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {value ? (
            <>
              Dipilih: <span className="font-mono text-foreground">{value}</span>
            </>
          ) : (
            "Tanpa ikon"
          )}
        </span>
        {value && (
          <button
            type="button"
            disabled={disabled}
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => onChange("")}
          >
            Hapus ikon
          </button>
        )}
      </div>
    </div>
  )
}