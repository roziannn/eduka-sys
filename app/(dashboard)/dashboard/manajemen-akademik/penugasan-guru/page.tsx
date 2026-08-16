"use client"

import * as React from "react"
import { Plus, Pencil, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface PenugasanGuru {
  id: string
  namaGuru: string
  mataPelajaran: string
  kelases: string[] // Diubah menjadi Array
  tahunAjaran: string
  isAktif: boolean
  createdAt: string
}

// Dummy Option Data
const listGuru = [
  "Budi Santoso, S.Pd.",
  "Siti Rahma, M.Pd.",
  "Eko Prasetyo, S.T.",
  "Rina Wijaya, S.Si.",
]

const listMapel = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Fisika",
  "Kimia",
  "Bahasa Sunda",
]

const listKelas = [
  "X IPA 1",
  "X IPA 2",
  "X IPS 1",
  "XI IPA 1",
  "XI IPA 2",
  "XII IPS 3",
]

const initialData: PenugasanGuru[] = [
  { id: "1", namaGuru: "Budi Santoso, S.Pd.", mataPelajaran: "Matematika", kelases: ["X IPA 1", "X IPA 2"], tahunAjaran: "2025/2026", isAktif: true, createdAt: "2025-01-10" },
  { id: "2", namaGuru: "Siti Rahma, M.Pd.", mataPelajaran: "Bahasa Indonesia", kelases: ["X IPS 1"], tahunAjaran: "2025/2026", isAktif: true, createdAt: "2025-01-10" },
  { id: "3", namaGuru: "Eko Prasetyo, S.T.", mataPelajaran: "Fisika", kelases: ["XI IPA 1", "XI IPA 2"], tahunAjaran: "2025/2026", isAktif: true, createdAt: "2025-01-12" },
  { id: "4", namaGuru: "Rina Wijaya, S.Si.", mataPelajaran: "Kimia", kelases: ["XII IPS 3"], tahunAjaran: "2024/2025", isAktif: false, createdAt: "2025-02-01" },
]

export default function PenugasanGuruPage() {
  const [data, setData] = React.useState<PenugasanGuru[]>(initialData)
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<{ col: keyof PenugasanGuru | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })
  
  // Pagination
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // Form Modal
  const [open, setOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<PenugasanGuru | null>(null)
  const [form, setForm] = React.useState({
    namaGuru: "",
    mataPelajaran: "",
    kelases: [] as string[],
    tahunAjaran: "2025/2026",
    isAktif: true,
  })

  // Toggle Sort
  const handleSort = (col: keyof PenugasanGuru) => {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc",
    }))
  }

  // Filter & Sort Logic
  const processedData = React.useMemo(() => {
    let result = data.filter((item) =>
      item.namaGuru.toLowerCase().includes(search.toLowerCase()) ||
      item.mataPelajaran.toLowerCase().includes(search.toLowerCase()) ||
      item.tahunAjaran.toLowerCase().includes(search.toLowerCase()) ||
      item.kelases.some((k) => k.toLowerCase().includes(search.toLowerCase()))
    )

    if (sort.col) {
      result.sort((a, b) => {
        const valA = a[sort.col!]
        const valB = b[sort.col!]
        const res = Array.isArray(valA) && Array.isArray(valB)
          ? valA.join(", ").localeCompare(valB.join(", "))
          : typeof valA === "string" 
          ? valA.localeCompare(valB as string) 
          : Number(valA) - Number(valB)
        return sort.dir === "asc" ? res : -res
      })
    }
    return result
  }, [data, search, sort])

  // Paginated Data
  const totalPages = Math.ceil(processedData.length / pageSize) || 1
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)

  // Open Dialog
  const handleOpen = (item?: PenugasanGuru) => {
    setEditItem(item || null)
    setForm(
      item
        ? {
            namaGuru: item.namaGuru,
            mataPelajaran: item.mataPelajaran,
            kelases: item.kelases,
            tahunAjaran: item.tahunAjaran,
            isAktif: item.isAktif,
          }
        : {
            namaGuru: listGuru[0] || "",
            mataPelajaran: listMapel[0] || "",
            kelases: [],
            tahunAjaran: "2025/2026",
            isAktif: true,
          }
    )
    setOpen(true)
  }

  // Save (Create/Update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.kelases.length === 0) return

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

  // Toggle Checkbox Kelas
  const handleKelasChange = (kelas: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      kelases: checked
        ? [...prev.kelases, kelas]
        : prev.kelases.filter((k) => k !== kelas),
    }))
  }

  // Toggle Status Switch Direct
  const handleToggle = (id: string) => {
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isAktif: !item.isAktif } : item))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Penugasan Guru</h1>
          <p className="text-sm text-muted-foreground">Plotting guru pengampu mata pelajaran ke beberapa kelas sekaligus.</p>
        </div>
        <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" /> Tambah Penugasan</Button>
      </div>

      <Input
        placeholder="Cari guru, mapel, atau kelas..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-xs"
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              {(["namaGuru", "mataPelajaran", "kelases", "tahunAjaran", "isAktif", "createdAt"] as const).map((col) => (
                <TableHead key={col}>
                  <Button variant="ghost" size="sm" onClick={() => handleSort(col)} className="-ml-3 h-8">
                    {col === "namaGuru"
                      ? "Nama Guru"
                      : col === "mataPelajaran"
                      ? "Mata Pelajaran"
                      : col === "kelases"
                      ? "Target Kelas"
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
                  <TableCell>{item.mataPelajaran}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[250px]">
                      {item.kelases.map((k) => (
                        <Badge key={k} variant="outline" className="text-xs">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{item.tahunAjaran}</TableCell>
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
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Data penugasan tidak ditemukan.
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
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit" : "Tambah"} Penugasan Guru</DialogTitle>
              <DialogDescription>Atur guru pengampu mata pelajaran untuk beberapa kelas sekaligus.</DialogDescription>
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
                      <SelectItem key={guru} value={guru}>{guru}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mataPelajaran">Mata Pelajaran</Label>
                <Select
                  value={form.mataPelajaran}
                >
                  <SelectTrigger id="mataPelajaran">
                    <SelectValue placeholder="Pilih Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    {listMapel.map((mapel) => (
                      <SelectItem key={mapel} value={mapel}>{mapel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Multiple Checkbox Kelas */}
              <div className="grid gap-2">
                <Label>Target Kelas (Pilih Minimal 1)</Label>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  {listKelas.map((kelas) => {
                    const isChecked = form.kelases.includes(kelas)
                    return (
                      <div key={kelas} className="flex items-center space-x-2">
                        <Checkbox
                          id={`kelas-${kelas}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleKelasChange(kelas, !!checked)}
                        />
                        <Label htmlFor={`kelas-${kelas}`} className="text-xs font-normal cursor-pointer">
                          {kelas}
                        </Label>
                      </div>
                    )
                  })}
                </div>
                {form.kelases.length === 0 && (
                  <p className="text-[0.8rem] text-destructive">Pilih setidaknya satu kelas.</p>
                )}
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
                  Status Penugasan
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
              <Button type="submit" disabled={form.kelases.length === 0}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}