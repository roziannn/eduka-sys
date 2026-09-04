"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  KeyRound,
  Send,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// --- TYPES ---
interface SoalKuis {
  id: string
  judulKuis: string
  mataPelajaran: string
  tingkat: "X" | "XI" | "XII"
  jumlahSoal: number
  durasiMenit: number
  token: string
  status: "Draft" | "Dipublikasikan" | "Selesai"
}

interface PesertaKuis {
  id: string
  nisn: string
  nama: string
  nilai: number
  status: "Belum Mengerjakan" | "Sedang Mengerjakan" | "Selesai"
}

const initialKuisData: SoalKuis[] = [
  { id: "k-1", judulKuis: "Kuis Matematika - Aljabar", mataPelajaran: "Matematika", tingkat: "X", jumlahSoal: 15, durasiMenit: 30, token: "MTK10X", status: "Dipublikasikan" },
  { id: "k-2", judulKuis: "Kuis Fisika - Hukum Newton", mataPelajaran: "Fisika", tingkat: "XI", jumlahSoal: 20, durasiMenit: 45, token: "FSK11Z", status: "Draft" },
  { id: "k-3", judulKuis: "Kuis B. Indonesia - Teks LHO", mataPelajaran: "Bahasa Indonesia", tingkat: "X", jumlahSoal: 10, durasiMenit: 20, token: "BIND10", status: "Selesai" },
]

const initialPesertaMap: Record<string, PesertaKuis[]> = {
  "k-1": [
    { id: "p-1", nisn: "0051234001", nama: "Ahmad Rizky", nilai: 88, status: "Selesai" },
    { id: "p-2", nisn: "0051234002", nama: "Amanda Citra", nilai: 65, status: "Selesai" },
    { id: "p-3", nisn: "0051234003", nama: "Bagas Pratama", nilai: 0, status: "Belum Mengerjakan" },
  ],
  "k-2": [
    { id: "p-4", nisn: "0051234004", nama: "Dina Larasati", nilai: 95, status: "Selesai" },
    { id: "p-5", nisn: "0051234005", nama: "Eko Wijaya", nilai: 78, status: "Selesai" },
  ],
}

export default function SoalKuisPage() {
  const [kuisData, setKuisData] = React.useState<SoalKuis[]>(initialKuisData)
  const [selectedKuis, setSelectedKuis] = React.useState<SoalKuis | null>(null)
  const [pesertaList, setPesertaList] = React.useState<PesertaKuis[]>([])

  // Filter & Search States
  const [filterTingkat, setFilterTingkat] = React.useState<string>("Semua")
  const [search, setSearch] = React.useState("")

  // Sort State
  const [sortKuis, setSortKuis] = React.useState<{ col: keyof SoalKuis | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })
  const [sortPeserta, setSortPeserta] = React.useState<{ col: keyof PesertaKuis | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })

  // Pagination State
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // Dialog Modals
  const [openPublishModal, setOpenPublishModal] = React.useState(false)
  const [openAddPesertaModal, setOpenAddPesertaModal] = React.useState(false)

  // Form State Peserta
  const [formPeserta, setFormPeserta] = React.useState({
    nisn: "",
    nama: "",
    nilai: "",
  })

  // Sort Logic
  const handleSortKuis = (col: keyof SoalKuis) => {
    setSortKuis((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  const handleSortPeserta = (col: keyof PesertaKuis) => {
    setSortPeserta((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  // Processed Data
  const processedKuisData = React.useMemo(() => {
    let result = kuisData.filter((item) => {
      const matchTingkat = filterTingkat === "Semua" || item.tingkat === filterTingkat
      const matchSearch =
        item.judulKuis.toLowerCase().includes(search.toLowerCase()) ||
        item.mataPelajaran.toLowerCase().includes(search.toLowerCase()) ||
        item.token.toLowerCase().includes(search.toLowerCase())
      return matchTingkat && matchSearch
    })

    if (sortKuis.col) {
      result.sort((a, b) => {
        const valA = a[sortKuis.col!]
        const valB = b[sortKuis.col!]
        const res = typeof valA === "string" ? valA.localeCompare(valB as string) : Number(valA) - Number(valB)
        return sortKuis.dir === "asc" ? res : -res
      })
    }
    return result
  }, [kuisData, filterTingkat, search, sortKuis])

  const processedPesertaData = React.useMemo(() => {
    let result = pesertaList.filter(
      (item) => item.nama.toLowerCase().includes(search.toLowerCase()) || item.nisn.includes(search)
    )

    if (sortPeserta.col) {
      result.sort((a, b) => {
        const valA = a[sortPeserta.col!]
        const valB = b[sortPeserta.col!]
        const res = typeof valA === "string" ? valA.localeCompare(valB as string) : Number(valA) - Number(valB)
        return sortPeserta.dir === "asc" ? res : -res
      })
    }
    return result
  }, [pesertaList, search, sortPeserta])

  // Pagination Calculations
  const activeDataLength = selectedKuis ? processedPesertaData.length : processedKuisData.length
  const totalPages = Math.ceil(activeDataLength / pageSize) || 1
  const paginatedKuis = processedKuisData.slice((page - 1) * pageSize, page * pageSize)
  const paginatedPeserta = processedPesertaData.slice((page - 1) * pageSize, page * pageSize)

  // Handlers
  const handleViewNilai = (kuis: SoalKuis) => {
    setSelectedKuis(kuis)
    setPesertaList(initialPesertaMap[kuis.id] || [])
    setSearch("")
    setPage(1)
  }

  const handleBackToKuis = () => {
    setSelectedKuis(null)
    setSearch("")
    setPage(1)
  }

  const handlePublishKuis = () => {
    if (selectedKuis) {
      setKuisData((prev) =>
        prev.map((k) => (k.id === selectedKuis.id ? { ...k, status: "Dipublikasikan" } : k))
      )
      setSelectedKuis((prev) => (prev ? { ...prev, status: "Dipublikasikan" } : null))
    }
    setOpenPublishModal(false)
  }

  const handleSavePeserta = (e: React.FormEvent) => {
    e.preventDefault()
    const nilaiNum = Number(formPeserta.nilai) || 0
    const newPeserta: PesertaKuis = {
      id: `p-${Date.now()}`,
      nisn: formPeserta.nisn,
      nama: formPeserta.nama,
      nilai: nilaiNum,
      status: nilaiNum === 0 ? "Belum Mengerjakan" : "Selesai",
    }
    setPesertaList((prev) => [...prev, newPeserta])
    setFormPeserta({ nisn: "", nama: "", nilai: "" })
    setOpenAddPesertaModal(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Daftar Soal Kuis
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedKuis
              ? `Hasil pengerjaan kuis: ${selectedKuis.judulKuis}`
              : "Kelola bank kuis interaktif, durasi, serta penilaian siswa."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedKuis ? (
            <>
              <Button variant="outline" onClick={handleBackToKuis}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Kembali
              </Button>
              <Button onClick={() => setOpenAddPesertaModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Peserta
              </Button>
              {selectedKuis.status === "Draft" && (
                <Button variant="secondary" onClick={() => setOpenPublishModal(true)}>
                  <Send className="mr-2 h-4 w-4" /> Publikasikan Kuis
                </Button>
              )}
            </>
          ) : (
            <Link
              href="/dashboard/soal-kuis/create"
              className={buttonVariants({ variant: "default" })}
            >
              <Plus className="h-4 w-4" /> Buat Kuis Baru
            </Link>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          placeholder={selectedKuis ? "Cari NISN atau nama peserta..." : "Cari judul kuis, mapel, atau token..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />

        {!selectedKuis && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filterTingkat} onValueChange={(val) => val && setFilterTingkat(val)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tingkat Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Kelas</SelectItem>
                <SelectItem value="X">Kelas X</SelectItem>
                <SelectItem value="XI">Kelas XI</SelectItem>
                <SelectItem value="XII">Kelas XII</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="rounded-md border bg-card">
        <Table>
          {!selectedKuis ? (
            /* TABLE LIST KUIS */
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {(["judulKuis", "mataPelajaran", "tingkat", "jumlahSoal", "durasiMenit", "token", "status"] as const).map((col) => (
                    <TableHead key={col}>
                      <Button variant="ghost" size="sm" onClick={() => handleSortKuis(col)} className="-ml-3 h-8">
                        {col === "judulKuis"
                          ? "Judul Kuis"
                          : col === "mataPelajaran"
                          ? "Mata Pelajaran"
                          : col === "tingkat"
                          ? "Kelas"
                          : col === "jumlahSoal"
                          ? "Soal"
                          : col === "durasiMenit"
                          ? "Durasi"
                          : col === "token"
                          ? "Token"
                          : "Status"}
                        {sortKuis.col === col ? (
                          sortKuis.dir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
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
                {paginatedKuis.length ? (
                  paginatedKuis.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-semibold">{item.judulKuis}</TableCell>
                      <TableCell>{item.mataPelajaran}</TableCell>
                      <TableCell><Badge variant="secondary">Kelas {item.tingkat}</Badge></TableCell>
                      <TableCell>{item.jumlahSoal} Soal</TableCell>
                      <TableCell>{item.durasiMenit} Mnt</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono gap-1">
                          <KeyRound className="h-3 w-3" />
                          {item.token}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "Dipublikasikan" || item.status === "Selesai" ? "default" : "outline"}
                          className={
                            item.status === "Dipublikasikan"
                              ? "bg-emerald-600"
                              : item.status === "Selesai"
                              ? "bg-blue-600"
                              : "text-amber-600 border-amber-300"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/dashboard/soal-kuis/edit`}
                            className={buttonVariants({ variant: "outline", size: "icon", className: "h-8 w-8 text-foreground" })}
                            title="Edit Kuis"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-foreground"
                            title="Lihat Peserta & Hasil"
                            onClick={() => handleViewNilai(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      Data kuis tidak ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </>
          ) : (
            /* TABLE LIST PESERTA & HASIL KUIS */
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {(["nisn", "nama", "nilai", "status"] as const).map((col) => (
                    <TableHead key={col}>
                      <Button variant="ghost" size="sm" onClick={() => handleSortPeserta(col)} className="-ml-3 h-8">
                        {col === "nisn"
                          ? "NISN"
                          : col === "nama"
                          ? "Nama Peserta"
                          : col === "nilai"
                          ? "Skor / Nilai"
                          : "Status Pengerjaan"}
                        {sortPeserta.col === col ? (
                          sortPeserta.dir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
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
                {paginatedPeserta.length ? (
                  paginatedPeserta.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono">{item.nisn}</TableCell>
                      <TableCell className="font-semibold">{item.nama}</TableCell>
                      <TableCell className="font-bold">{item.nilai}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "Selesai" ? "default" : "outline"}
                          className={
                            item.status === "Selesai"
                              ? "bg-emerald-600"
                              : item.status === "Sedang Mengerjakan"
                              ? "text-amber-600 border-amber-300"
                              : ""
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          <Printer className="mr-1 h-3.5 w-3.5" /> Hasil Kuis
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Data peserta tidak ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </>
          )}
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Baris per halaman</span>
            <Select value={String(pageSize)} onValueChange={(v) => { if (v) { setPageSize(Number(v)); setPage(1) } }}>
              <SelectTrigger className="h-8 w-[65px]">
                <SelectValue />
              </SelectTrigger>
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
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH PESERTA */}
      <Dialog open={openAddPesertaModal} onOpenChange={setOpenAddPesertaModal}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSavePeserta} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tambah Peserta Kuis</DialogTitle>
              <DialogDescription>
                Daftarkan peserta ke kuis: {selectedKuis?.judulKuis}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="nisn">NISN / ID Siswa</Label>
                <Input
                  id="nisn"
                  placeholder="Contoh: 0051234009"
                  value={formPeserta.nisn}
                  onChange={(e) => setFormPeserta({ ...formPeserta, nisn: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="namaSiswa">Nama Peserta</Label>
                <Input
                  id="namaSiswa"
                  placeholder="Masukkan nama peserta"
                  value={formPeserta.nama}
                  onChange={(e) => setFormPeserta({ ...formPeserta, nama: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nilai">Skor Kuis (Opsional)</Label>
                <Input
                  id="nilai"
                  type="number"
                  placeholder="0"
                  value={formPeserta.nilai}
                  onChange={(e) => setFormPeserta({ ...formPeserta, nilai: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAddPesertaModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL PUBLISH KUIS */}
      <Dialog open={openPublishModal} onOpenChange={setOpenPublishModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Publikasikan Kuis</DialogTitle>
            <DialogDescription>
              Kuis {selectedKuis?.judulKuis} akan siap dikerjakan oleh siswa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Mata Pelajaran & Kelas</Label>
              <Input value={`${selectedKuis?.mataPelajaran || ""} (Kelas ${selectedKuis?.tingkat || ""})`} disabled />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenPublishModal(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handlePublishKuis}>
              Publikasikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}