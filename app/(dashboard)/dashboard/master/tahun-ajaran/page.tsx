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

  interface TahunAjaran {
    id: string
    tahun: string
    semester: "Ganjil" | "Genap"
    isAktif: boolean
    createdAt: string
  }

  const initialData: TahunAjaran[] = [
    { id: "1", tahun: "2024/2025", semester: "Genap", isAktif: false, createdAt: "2025-01-10" },
    { id: "2", tahun: "2025/2026", semester: "Ganjil", isAktif: true, createdAt: "2025-06-15" },
    { id: "3", tahun: "2025/2026", semester: "Genap", isAktif: false, createdAt: "2025-11-20" },
    { id: "4", tahun: "2026/2027", semester: "Ganjil", isAktif: false, createdAt: "2026-01-05" },
  ]

  export default function TahunAjaranPage() {
    const [data, setData] = React.useState(initialData)
    const [search, setSearch] = React.useState("")
    const [sort, setSort] = React.useState<{ col: keyof TahunAjaran | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })
    
    // Pagination
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(5)

    // Form Modal
    const [open, setOpen] = React.useState(false)
    const [editItem, setEditItem] = React.useState<TahunAjaran | null>(null)
    const [form, setForm] = React.useState({ tahun: "", semester: "Ganjil" as "Ganjil" | "Genap", isAktif: false })

    // Toggle Sort
    const handleSort = (col: keyof TahunAjaran) => {
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
    const handleOpen = (item?: TahunAjaran) => {
      setEditItem(item || null)
      setForm(item ? { tahun: item.tahun, semester: item.semester, isAktif: item.isAktif } : { tahun: "", semester: "Ganjil", isAktif: false })
      setOpen(true)
    }

    // Save (Create/Update)
    const handleSave = (e: React.FormEvent) => {
      e.preventDefault()
      setData((prev) => {
        const updated = editItem
          ? prev.map((i) => (i.id === editItem.id ? { ...i, ...form } : form.isAktif ? { ...i, isAktif: false } : i))
          : [...(form.isAktif ? prev.map((i) => ({ ...i, isAktif: false })) : prev), { id: Date.now().toString(), ...form, createdAt: new Date().toISOString().split("T")[0] }]
        return updated
      })
      setOpen(false)
    }

    // Toggle Status Switch Direct
    const handleToggle = (id: string) => {
      setData((prev) => prev.map((item) => item.id === id ? { ...item, isAktif: !item.isAktif } : item.isAktif ? { ...item, isAktif: false } : item))
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Master Tahun Ajaran</h1>
            <p className="text-sm text-muted-foreground">Kelola periode tahun ajaran & semester.</p>
          </div>
          <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" /> Tambah</Button>
        </div>

        <Input
          placeholder="Cari..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">No</TableHead>
                {(["tahun", "semester", "isAktif", "createdAt"] as const).map((col) => (
                  <TableHead key={col}>
                    <Button variant="ghost" size="sm" onClick={() => handleSort(col)} className="-ml-3 h-8">
                      {col === "tahun" ? "Tahun Ajaran" : col === "semester" ? "Semester" : col === "isAktif" ? "Status" : "Tanggal Dibuat"}
                      {sort.col === col ? (sort.dir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />) : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />}
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length ? paginatedData.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">{item.tahun}</TableCell>
                  <TableCell>{item.semester}</TableCell>
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
              )) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Data tidak ditemukan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          {/* Simplified Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Baris per halaman</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
                <SelectTrigger className="h-8 w-[65px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 20].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
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

        {/* Single Modal Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit" : "Tambah"} Tahun Ajaran</DialogTitle>
              <DialogDescription>Kelola detail periode tahun ajaran.</DialogDescription>
            </DialogHeader>

            {/* Jarak antar field dikelola space-y-4, jarak label & input dikelola grid gap-2 */}
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="tahun">Tahun Ajaran</Label>
                <Input
                  id="tahun"
                  placeholder="Contoh: 2025/2026"
                  value={form.tahun}
                  onChange={(e) => setForm({ ...form, tahun: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="semester">Semester</Label>
                <Select
                  value={form.semester}
                  onValueChange={(v) => setForm({ ...form, semester: v as "Ganjil" | "Genap" })}
                >
                  <SelectTrigger id="semester">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ganjil">Ganjil</SelectItem>
                    <SelectItem value="Genap">Genap</SelectItem>
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