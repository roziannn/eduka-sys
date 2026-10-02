"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Pencil, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

type Tingkat = "10" | "11" | "12"

interface Kelas {
  id: string
  namaKelas: string
  tingkat: Tingkat
  jurusan: string
  kapasitas: number
  isAktif: boolean
  createdAt: string
  createdBy: string
}

const KELAS_KEY = ["kelas"]

const COLUMNS: { key: keyof Kelas; label: string }[] = [
  { key: "namaKelas", label: "Nama Kelas" },
  { key: "tingkat", label: "Tingkat" },
  { key: "jurusan", label: "Jurusan" },
  { key: "kapasitas", label: "Kapasitas" },
  { key: "isAktif", label: "Status" },
  { key: "createdAt", label: "Tanggal Dibuat" },
  { key: "createdBy", label: "Dibuat Oleh" },
]

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

export default function KelasPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<{ col: keyof Kelas | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })

  // Pagination
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // Form Modal
  const [open, setOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<Kelas | null>(null)
  const [form, setForm] = React.useState({
    namaKelas: "",
    tingkat: "10" as Tingkat,
    jurusan: "MIPA",
    kapasitas: 36,
    isAktif: true,
  })

  const {
    data = [],
    isLoading,
    error: dataError,
  } = useQuery<Kelas[]>({
    queryKey: KELAS_KEY,
    queryFn: () => fetchJson<Kelas[]>("/api/kelas"),
  })

  React.useEffect(() => {
    if (dataError) {
      toast.error(`Gagal memuat data: ${getErrorMessage(dataError)}`)
    }
  }, [dataError])

  const saveMutation = useMutation({
    mutationFn: (input: { id?: string; body: Record<string, unknown> }) =>
      fetchJson(input.id ? `/api/kelas/${input.id}` : "/api/kelas", {
        method: input.id ? "PUT" : "POST",
        body: input.body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KELAS_KEY }),
  })

  const handleSort = (col: keyof Kelas) => {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc",
    }))
  }

  const processedData = React.useMemo(() => {
    const keyword = search.toLowerCase()
    const result = data.filter(
      (item) =>
        item.namaKelas.toLowerCase().includes(keyword) ||
        `kelas ${item.tingkat}`.includes(keyword) ||
        item.jurusan.toLowerCase().includes(keyword) ||
        `${item.kapasitas} siswa`.includes(keyword) ||
        (item.isAktif ? "aktif" : "tidak aktif").includes(keyword) ||
        formatDate(item.createdAt).toLowerCase().includes(keyword) ||
        item.createdBy.toLowerCase().includes(keyword)
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

  const totalPages = Math.ceil(processedData.length / pageSize) || 1
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)

  const handleOpen = (item?: Kelas) => {
    setEditItem(item || null)
    setForm(
      item
        ? { namaKelas: item.namaKelas, tingkat: item.tingkat, jurusan: item.jurusan, kapasitas: item.kapasitas, isAktif: item.isAktif }
        : { namaKelas: "", tingkat: "10", jurusan: "MIPA", kapasitas: 36, isAktif: true }
    )
    setOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const isEdit = Boolean(editItem)

    saveMutation.mutate(
      { id: editItem?.id, body: form },
      {
        onSuccess: () => {
          toast.success(`Kelas berhasil ${isEdit ? "diperbarui" : "ditambahkan"}!`)
          setOpen(false)
        },
        onError: (err) => {
          toast.error(`${isEdit ? "Gagal memperbarui" : "Gagal menambah"} kelas: ${getErrorMessage(err)}`)
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Data Kelas</h1>
          <p className="text-sm text-muted-foreground">Kelola ruang kelas, tingkat, dan alokasi jurusan.</p>
        </div>
        <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" /> Tambah Kelas</Button>
      </div>

      <Input
        placeholder="Cari kelas atau jurusan..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-xs"
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              {COLUMNS.map((col) => (
                <TableHead key={col.key}>
                  <Button variant="ghost" size="sm" onClick={() => handleSort(col.key)} className="-ml-3 h-8">
                    {col.label}
                    {sort.col === col.key ? (
                      sort.dir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                    )}
                  </Button>
                </TableHead>
              ))}
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length ? (
              paginatedData.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">{item.namaKelas}</TableCell>
                  <TableCell>Kelas {item.tingkat}</TableCell>
                  <TableCell>
                    {item.jurusan ? <Badge variant="outline">{item.jurusan}</Badge> : "-"}
                  </TableCell>
                  <TableCell>{item.kapasitas} Siswa</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.isAktif ? "default" : "outline"} className={item.isAktif ? "bg-emerald-600" : ""}>
                        {item.isAktif ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(item.createdAt)}</TableCell>
                  <TableCell className="text-sm">{item.createdBy}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleOpen(item)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
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
            <Select value={String(pageSize)} onValueChange={(v) => { if (v) setPageSize(Number(v)); setPage(1) }}>
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
              <DialogTitle>{editItem ? "Edit" : "Tambah"} Kelas</DialogTitle>
              <DialogDescription>Kelola detail informasi ruang kelas.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="namaKelas">Nama Kelas</Label>
                <Input
                  id="namaKelas"
                  placeholder="Contoh: X IPA 1"
                  value={form.namaKelas}
                  onChange={(e) => setForm({ ...form, namaKelas: e.target.value })}
                  maxLength={50}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tingkat">Tingkat</Label>
                <Select
                  value={form.tingkat}
                  onValueChange={(v) => { if (v) setForm({ ...form, tingkat: v as Tingkat }) }}
                >
                  <SelectTrigger id="tingkat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Tingkat 10</SelectItem>
                    <SelectItem value="11">Tingkat 11</SelectItem>
                    <SelectItem value="12">Tingkat 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="jurusan">Jurusan</Label>
                <Input
                  id="jurusan"
                  placeholder="Contoh: MIPA / IPS / Rekayasa Perangkat Lunak"
                  value={form.jurusan}
                  onChange={(e) => setForm({ ...form, jurusan: e.target.value })}
                  maxLength={50}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="kapasitas">Kapasitas Siswa</Label>
                <Input
                  id="kapasitas"
                  type="number"
                  placeholder="36"
                  min={1}
                  max={200}
                  value={form.kapasitas}
                  onChange={(e) => setForm({ ...form, kapasitas: Number(e.target.value) })}
                  required
                />
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saveMutation.isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}