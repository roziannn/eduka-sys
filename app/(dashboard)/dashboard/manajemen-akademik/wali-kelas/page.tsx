"use client"

import * as React from "react"
import { Plus, Pencil, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface WaliKelas {
  id: string
  namaGuru: string
  nip: string
  kelas: string
  tahunAjaran: string
  isAktif: boolean
  createdAt: string
}

// Dummy Master Data
const listGuru = [
  { nama: "Budi Santoso, S.Pd.", nip: "198503152010011002" },
  { nama: "Siti Rahma, M.Pd.", nip: "198807222014022001" },
  { nama: "Eko Prasetyo, S.T.", nip: "199011042018011003" },
  { nama: "Rina Wijaya, S.Si.", nip: "199201182019032004" },
  { nama: "Ahmad Dahlan, M.Si.", nip: "198305102008011001" },
]

const listKelas = [
  "X IPA 1",
  "X IPA 2",
  "X IPS 1",
  "XI IPA 1",
  "XI IPA 2",
  "XII IPS 3",
]

const initialData: WaliKelas[] = [
  { id: "1", namaGuru: "Budi Santoso, S.Pd.", nip: "198503152010011002", kelas: "X IPA 1", tahunAjaran: "2025/2026", isAktif: true, createdAt: "2025-01-10" },
  { id: "2", namaGuru: "Siti Rahma, M.Pd.", nip: "198807222014022001", kelas: "XI IPA 1", tahunAjaran: "2025/2026", isAktif: true, createdAt: "2025-01-10" },
  { id: "3", namaGuru: "Eko Prasetyo, S.T.", nip: "199011042018011003", kelas: "XII IPS 3", tahunAjaran: "2024/2025", isAktif: false, createdAt: "2025-02-01" },
]

export default function WaliKelasPage() {
  const [data, setData] = React.useState<WaliKelas[]>(initialData)
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<{ col: keyof WaliKelas | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })
  
  // Pagination State
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // Modal State
  const [open, setOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<WaliKelas | null>(null)
  const [form, setForm] = React.useState({
    namaGuru: "",
    nip: "",
    kelas: "",
    tahunAjaran: "2025/2026",
    isAktif: true,
  })

  // Handle Dynamic Sort
  const handleSort = (col: keyof WaliKelas) => {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc",
    }))
  }

  // Sorting & Searching Logic
  const processedData = React.useMemo(() => {
    let result = data.filter((item) =>
      item.namaGuru.toLowerCase().includes(search.toLowerCase()) ||
      item.nip.includes(search) ||
      item.kelas.toLowerCase().includes(search.toLowerCase()) ||
      item.tahunAjaran.toLowerCase().includes(search.toLowerCase())
    )

    if (sort.col) {
      result.sort((a, b) => {
        const valA = a[sort.col!]
        const valB = b[sort.col!]
        const res = typeof valA === "string" 
          ? valA.localeCompare(valB as string) 
          : Number(valA) - Number(valB)
        return sort.dir === "asc" ? res : -res
      })
    }
    return result
  }, [data, search, sort])

  // Pagination Logic
  const totalPages = Math.ceil(processedData.length / pageSize) || 1
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)

  // Open Add/Edit Modal
  const handleOpen = (item?: WaliKelas) => {
    setEditItem(item || null)
    if (item) {
      setForm({
        namaGuru: item.namaGuru,
        nip: item.nip,
        kelas: item.kelas,
        tahunAjaran: item.tahunAjaran,
        isAktif: item.isAktif,
      })
    } else {
      const defaultGuru = listGuru[0]
      setForm({
        namaGuru: defaultGuru.nama,
        nip: defaultGuru.nip,
        kelas: listKelas[0] || "",
        tahunAjaran: "2025/2026",
        isAktif: true,
      })
    }
    setOpen(true)
  }

  // Auto Select NIP when Guru changed
  const handleGuruSelect = (nama: string) => {
    const selected = listGuru.find((g) => g.nama === nama)
    setForm((prev) => ({
      ...prev,
      namaGuru: nama,
      nip: selected ? selected.nip : "",
    }))
  }

  // Save Data
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

  // Toggle Direct Active Status
  const handleToggle = (id: string) => {
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isAktif: !item.isAktif } : item))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" /> Data Wali Kelas
          </h1>
          <p className="text-sm text-muted-foreground">Penetapan dan penugasan guru sebagai wali kelas per tahun ajaran.</p>
        </div>
        <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" /> Tambah Wali Kelas</Button>
      </div>

      <Input
        placeholder="Cari wali kelas, NIP, atau kelas..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-xs"
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              {(["namaGuru", "nip", "kelas", "tahunAjaran", "isAktif", "createdAt"] as const).map((col) => (
                <TableHead key={col}>
                  <Button variant="ghost" size="sm" onClick={() => handleSort(col)} className="-ml-3 h-8">
                    {col === "namaGuru"
                      ? "Nama Wali Kelas"
                      : col === "nip"
                      ? "NIP"
                      : col === "kelas"
                      ? "Wali Kelas Dari"
                      : col === "tahunAjaran"
                      ? "Tahun Ajaran"
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
                  <TableCell className="font-semibold">{item.namaGuru}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{item.nip}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-bold">
                      {item.kelas}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{item.tahunAjaran}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.isAktif ? "default" : "outline"} className={item.isAktif ? "bg-emerald-600" : ""}>
                        {item.isAktif ? "Aktif" : "Non-Aktif"}
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
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Data wali kelas tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
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
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit" : "Tambah"} Wali Kelas</DialogTitle>
              <DialogDescription>Penugasan guru penanggung jawab (Wali Kelas).</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="namaGuru">Pilih Guru</Label>
                <Select
                  value={form.namaGuru}
                >
                  <SelectTrigger id="namaGuru">
                    <SelectValue placeholder="Pilih Guru" />
                  </SelectTrigger>
                  <SelectContent>
                    {listGuru.map((guru) => (
                      <SelectItem key={guru.nip} value={guru.nama}>{guru.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" value={form.nip} disabled className="bg-muted" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="kelas">Kelas Ampuan</Label>
                <Select
                  value={form.kelas}
                >
                  <SelectTrigger id="kelas">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {listKelas.map((kelas) => (
                      <SelectItem key={kelas} value={kelas}>{kelas}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tahunAjaran">Tahun Ajaran</Label>
                <Input
                  id="tahunAjaran"
                  placeholder="Contoh: 2025/2026"
                  value={form.tahunAjaran}
                  onChange={(e) => setForm({ ...form, tahunAjaran: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="isAktif" className="cursor-pointer">
                  Status Keaktifan
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
              <Button type="submit">
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}