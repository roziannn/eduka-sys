"use client"

import * as React from "react"
import { Plus, Pencil, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Pengguna {
  id: string
  nama: string
  email: string
  role: "Admin" | "Guru" | "Siswa"
  isAktif: boolean
  createdAt: string
}

const initialData: Pengguna[] = [
  { id: "1", nama: "Admin Utama", email: "admin@sekolah.sch.id", role: "Admin", isAktif: true, createdAt: "2025-01-01" },
  { id: "2", nama: "Budi Santoso, S.Pd.", email: "budi.santoso@sekolah.sch.id", role: "Guru", isAktif: true, createdAt: "2025-01-10" },
  { id: "3", nama: "Siti Rahma, M.Pd.", email: "siti.rahma@sekolah.sch.id", role: "Guru", isAktif: true, createdAt: "2025-01-15" },
  { id: "4", nama: "Ahmad Rizky", email: "ahmad.rizky@siswa.sch.id", role: "Siswa", isAktif: true, createdAt: "2025-02-01" },
  { id: "5", nama: "Dewi Lestari", email: "dewi.lestari@siswa.sch.id", role: "Siswa", isAktif: false, createdAt: "2025-02-05" },
]

export default function PenggunaPage() {
  const [data, setData] = React.useState<Pengguna[]>(initialData)
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<{ col: keyof Pengguna | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })
  
  // Pagination
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // Form Modal
  const [open, setOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<Pengguna | null>(null)
  const [form, setForm] = React.useState({
    nama: "",
    email: "",
    role: "Siswa" as "Admin" | "Guru" | "Siswa",
    isAktif: true,
  })

  // Toggle Sort
  const handleSort = (col: keyof Pengguna) => {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc",
    }))
  }

  // Filter & Sort Logic
  const processedData = React.useMemo(() => {
    let result = data.filter((item) =>
      Object.values(item).some((val) => String(val).toLowerCase().includes(search.toLowerCase()))
    )

    if (sort.col) {
      result.sort((a, b) => {
        const valA = a[sort.col!]
        const valB = b[sort.col!]
        const res = typeof valA === "string" ? valA.localeCompare(valB as string) : Number(valA) - Number(valB)
        return sort.dir === "asc" ? res : -res
      })
    }
    return result
  }, [data, search, sort])

  // Paginated Data
  const totalPages = Math.ceil(processedData.length / pageSize) || 1
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)

  // Open Dialog
  const handleOpen = (item?: Pengguna) => {
    setEditItem(item || null)
    setForm(
      item
        ? { nama: item.nama, email: item.email, role: item.role, isAktif: item.isAktif }
        : { nama: "", email: "", role: "Siswa", isAktif: true }
    )
    setOpen(true)
  }

  // Save (Create/Update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setData((prev) => {
      if (editItem) {
        return prev.map((i) => (i.id === editItem.id ? { ...i, ...form } : i))
      }
      return [
        ...prev,
        { id: Date.now().toString(), ...form, createdAt: new Date().toISOString().split("T")[0] },
      ]
    })
    setOpen(false)
  }

  // Toggle Status Switch Direct
  const handleToggle = (id: string) => {
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isAktif: !item.isAktif } : item))
    )
  }

  // Helper untuk warna badge Role
  const getRoleBadgeVariant = (role: Pengguna["role"]) => {
    switch (role) {
      case "Admin":
        return "destructive"
      case "Guru":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Data Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola akun pengguna, peran sistem, dan status akses.</p>
        </div>
        <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" /> Tambah Pengguna</Button>
      </div>

      <Input
        placeholder="Cari nama, email, atau role..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-xs"
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              {(["nama", "email", "role", "isAktif", "createdAt"] as const).map((col) => (
                <TableHead key={col}>
                  <Button variant="ghost" size="sm" onClick={() => handleSort(col)} className="-ml-3 h-8">
                    {col === "nama"
                      ? "Nama Pengguna"
                      : col === "email"
                      ? "Email"
                      : col === "role"
                      ? "Role"
                      : col === "isAktif"
                      ? "Status"
                      : "Tanggal Dibuat"}
                    {sort.col === col ? (
                      sort.dir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                    )}
                  </Button>
                </TableHead>
              ))}
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length ? (
              paginatedData.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">{item.nama}</TableCell>
                  <TableCell className="text-sm">{item.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(item.role)}>{item.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.isAktif ? "default" : "outline"} className={item.isAktif ? "bg-emerald-600" : ""}>
                        {item.isAktif ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleOpen(item)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Data tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Baris per halaman</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className="h-8 w-[65px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 20].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span>Halaman {page} dari {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit" : "Tambah"} Pengguna</DialogTitle>
              <DialogDescription>Kelola detail profil pengguna dan akses sistem.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input
                  id="nama"
                  placeholder="Contoh: Budi Santoso"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@sekolah.sch.id"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role / Peran</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as "Admin" | "Guru" | "Siswa" })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Guru">Guru</SelectItem>
                    <SelectItem value="Siswa">Siswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="isAktif" className="cursor-pointer">
                  Status Aktif
                </Label>
                <Switch
                  id="isAktif"
                  checked={form.isAktif}
                  onCheckedChange={(v) => setForm({ ...form, isAktif: v })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}