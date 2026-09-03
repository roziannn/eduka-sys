"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Pencil,
  Plus,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Award,
  KeyRound,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// --- TYPES ---
interface SoalUjian {
  id: string
  namaUjian: string
  mataPelajaran: string
  jenisUjian: "UH" | "UTS" | "UAS" | "US"
  kelas: string
  tahunAjaran: string
  semester: string
  jumlahSoal: number
  durasiMenit: number
  token: string
  status: "Draft" | "Terrevisi" | "Siap Ujian" | "Selesai"
}

interface PesertaUjian {
  id: string
  nisn: string
  nama: string
  nilai: number
  statusUjian: "Belum Mengerjakan" | "Sedang Mengerjakan" | "Selesai" | "Perlu Remidial"
}

// --- DUMMY DATA ---
const listTahunAjaran = ["2025/2026", "2024/2025"]
const listSemester = ["Genap", "Ganjil"]

const initialUjianData: SoalUjian[] = [
  { id: "u-1", namaUjian: "UTS Matematika Wajib X", mataPelajaran: "Matematika", jenisUjian: "UTS", kelas: "X IPA 1", tahunAjaran: "2025/2026", semester: "Genap", jumlahSoal: 30, durasiMenit: 90, token: "MTK10X", status: "Siap Ujian" },
  { id: "u-2", namaUjian: "UAS Fisika Dasar XI", mataPelajaran: "Fisika", jenisUjian: "UAS", kelas: "XI IPA 2", tahunAjaran: "2025/2026", semester: "Genap", jumlahSoal: 40, durasiMenit: 120, token: "FSK11Z", status: "Draft" },
  { id: "u-3", namaUjian: "UH Bahasa Indonesia X", mataPelajaran: "Bahasa Indonesia", jenisUjian: "UH", kelas: "X IPS 1", tahunAjaran: "2024/2025", semester: "Ganjil", jumlahSoal: 20, durasiMenit: 45, token: "BIND10", status: "Selesai" },
]

const initialPesertaMap: Record<string, PesertaUjian[]> = {
  "u-1": [
    { id: "p-1", nisn: "0051234001", nama: "Ahmad Rizky", nilai: 88, statusUjian: "Selesai" },
    { id: "p-2", nisn: "0051234002", nama: "Amanda Citra", nilai: 62, statusUjian: "Perlu Remidial" },
    { id: "p-3", nisn: "0051234003", nama: "Bagas Pratama", nilai: 0, statusUjian: "Belum Mengerjakan" },
  ],
  "u-2": [
    { id: "p-4", nisn: "0051234004", nama: "Dina Larasati", nilai: 95, statusUjian: "Selesai" },
    { id: "p-5", nisn: "0051234005", nama: "Eko Wijaya", nilai: 78, statusUjian: "Selesai" },
  ],
}

export default function SoalUjianPage() {
  const [ujianData, setUjianData] = React.useState<SoalUjian[]>(initialUjianData)
  const [selectedUjian, setSelectedUjian] = React.useState<SoalUjian | null>(null)
  const [pesertaList, setPesertaList] = React.useState<PesertaUjian[]>([])

  // Filter & Search States
  const [tahunAjaran, setTahunAjaran] = React.useState("2025/2026")
  const [semester, setSemester] = React.useState("Genap")
  const [search, setSearch] = React.useState("")

  // Sort State
  const [sortUjian, setSortUjian] = React.useState<{ col: keyof SoalUjian | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })
  const [sortPeserta, setSortPeserta] = React.useState<{ col: keyof PesertaUjian | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })

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
  const handleSortUjian = (col: keyof SoalUjian) => {
    setSortUjian((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  const handleSortPeserta = (col: keyof PesertaUjian) => {
    setSortPeserta((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  // Processed Data
  const processedUjianData = React.useMemo(() => {
    let result = ujianData.filter(
      (item) =>
        item.tahunAjaran === tahunAjaran &&
        item.semester === semester &&
        (item.namaUjian.toLowerCase().includes(search.toLowerCase()) ||
          item.mataPelajaran.toLowerCase().includes(search.toLowerCase()) ||
          item.kelas.toLowerCase().includes(search.toLowerCase()) ||
          item.token.toLowerCase().includes(search.toLowerCase()))
    )

    if (sortUjian.col) {
      result.sort((a, b) => {
        const valA = a[sortUjian.col!]
        const valB = b[sortUjian.col!]
        const res = typeof valA === "string" ? valA.localeCompare(valB as string) : Number(valA) - Number(valB)
        return sortUjian.dir === "asc" ? res : -res
      })
    }
    return result
  }, [ujianData, tahunAjaran, semester, search, sortUjian])

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
  const activeDataLength = selectedUjian ? processedPesertaData.length : processedUjianData.length
  const totalPages = Math.ceil(activeDataLength / pageSize) || 1
  const paginatedUjian = processedUjianData.slice((page - 1) * pageSize, page * pageSize)
  const paginatedPeserta = processedPesertaData.slice((page - 1) * pageSize, page * pageSize)

  // Handlers
  const handleViewNilai = (ujian: SoalUjian) => {
    setSelectedUjian(ujian)
    setPesertaList(initialPesertaMap[ujian.id] || [])
    setSearch("")
    setPage(1)
  }

  const handleBackToUjian = () => {
    setSelectedUjian(null)
    setSearch("")
    setPage(1)
  }

  const handlePublishAll = () => {
    if (selectedUjian) {
      setUjianData((prev) =>
        prev.map((u) => (u.id === selectedUjian.id ? { ...u, status: "Siap Ujian" } : u))
      )
      setSelectedUjian((prev) => (prev ? { ...prev, status: "Siap Ujian" } : null))
    }
    setOpenPublishModal(false)
  }

  const handleSavePeserta = (e: React.FormEvent) => {
    e.preventDefault()
    const nilaiNum = Number(formPeserta.nilai) || 0
    const newPeserta: PesertaUjian = {
      id: `p-${Date.now()}`,
      nisn: formPeserta.nisn,
      nama: formPeserta.nama,
      nilai: nilaiNum,
      statusUjian: nilaiNum === 0 ? "Belum Mengerjakan" : nilaiNum < 70 ? "Perlu Remidial" : "Selesai",
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
            Soal Ujian
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedUjian
              ? `Manajemen hasil dan peserta ujian: ${selectedUjian.namaUjian}`
              : "Kelola bank soal, jadwal ujian, serta penilaian peserta."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedUjian ? (
            <>
              <Button variant="outline" onClick={handleBackToUjian}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Kembali
              </Button>
              <Button onClick={() => setOpenAddPesertaModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Peserta
              </Button>
              {selectedUjian.status === "Draft" && (
                <Button variant="secondary" onClick={() => setOpenPublishModal(true)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Terbitkan Ujian
                </Button>
              )}
            </>
          ) : (
            /* LINK DIPAKAI LANGSUNG DENGAN CLASS BUTTON */
            <Link
              href="/dashboard/soal-ujian/create"
              className={buttonVariants({ variant: "default" })}
            >
              <Plus className="h-4 w-4" /> Buat Ujian Baru
            </Link>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          placeholder={selectedUjian ? "Cari NISN atau nama peserta..." : "Cari nama ujian, mapel, kelas, atau token..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />

        {!selectedUjian && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* HANDLING VALUE STRING | NULL UNTUK TS BASE-UI */}
            <Select value={tahunAjaran} onValueChange={(val) => val && setTahunAjaran(val)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tahun Ajaran" />
              </SelectTrigger>
              <SelectContent>
                {listTahunAjaran.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={semester} onValueChange={(val) => val && setSemester(val)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                {listSemester.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="rounded-md border bg-card">
        <Table>
          {!selectedUjian ? (
            /* TABLE LIST UJIAN */
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {(["namaUjian", "mataPelajaran", "jenisUjian", "kelas", "tahunAjaran", "semester", "token", "status"] as const).map((col) => (
                    <TableHead key={col}>
                      <Button variant="ghost" size="sm" onClick={() => handleSortUjian(col)} className="-ml-3 h-8">
                        {col === "namaUjian"
                          ? "Nama Ujian"
                          : col === "mataPelajaran"
                          ? "Mata Pelajaran"
                          : col === "jenisUjian"
                          ? "Jenis"
                          : col === "kelas"
                          ? "Kelas"
                          : col === "tahunAjaran"
                          ? "Tahun Ajaran"
                          : col === "semester"
                          ? "Semester"
                          : col === "token"
                          ? "Token"
                          : "Status"}
                        {sortUjian.col === col ? (
                          sortUjian.dir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
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
                {paginatedUjian.length ? (
                  paginatedUjian.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-semibold">{item.namaUjian}</TableCell>
                      <TableCell>{item.mataPelajaran}</TableCell>
                      <TableCell><Badge variant="outline">{item.jenisUjian}</Badge></TableCell>
                      <TableCell>{item.kelas}</TableCell>
                      <TableCell>{item.tahunAjaran}</TableCell>
                      <TableCell>{item.semester}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono gap-1">
                          <KeyRound className="h-3 w-3" />
                          {item.token}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "Siap Ujian" || item.status === "Selesai" ? "default" : "outline"}
                          className={
                            item.status === "Siap Ujian"
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
                            href={`/dashboard/soal-ujian/edit`}
                            className={buttonVariants({ variant: "outline", size: "icon", className: "h-8 w-8 text-foreground" })}
                            title="Edit Soal & Config"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-foreground"
                            title="Lihat Nilai Peserta"
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
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      Data ujian tidak ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </>
          ) : (
            /* TABLE LIST PESERTA & NILAI */
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {(["nisn", "nama", "nilai", "statusUjian"] as const).map((col) => (
                    <TableHead key={col}>
                      <Button variant="ghost" size="sm" onClick={() => handleSortPeserta(col)} className="-ml-3 h-8">
                        {col === "nisn"
                          ? "NISN"
                          : col === "nama"
                          ? "Nama Peserta"
                          : col === "nilai"
                          ? "Nilai Ujian"
                          : "Status Mengerjakan"}
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
                          variant={item.statusUjian === "Selesai" ? "default" : "outline"}
                          className={
                            item.statusUjian === "Selesai"
                              ? "bg-emerald-600"
                              : item.statusUjian === "Perlu Remidial"
                              ? "text-red-600 border-red-300"
                              : item.statusUjian === "Sedang Mengerjakan"
                              ? "text-amber-600 border-amber-300"
                              : ""
                          }
                        >
                          {item.statusUjian}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          <Printer className="mr-1 h-3.5 w-3.5" /> Lembar Jawaban
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
              <DialogTitle>Tambah Peserta Ujian</DialogTitle>
              <DialogDescription>
                Daftarkan peserta ujian ke {selectedUjian?.namaUjian}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="nisn">NISN</Label>
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
                <Label htmlFor="nilai">Nilai Akhir (Opsional)</Label>
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

      {/* MODAL PUBLISH UJIAN */}
      <Dialog open={openPublishModal} onOpenChange={setOpenPublishModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Terbitkan Paket Ujian</DialogTitle>
            <DialogDescription>
              Ujian {selectedUjian?.namaUjian} akan diubah statusnya menjadi **Siap Ujian**.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Mata Pelajaran & Kelas</Label>
              <Input value={`${selectedUjian?.mataPelajaran || ""} (${selectedUjian?.kelas || ""})`} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Tahun Ajaran & Semester</Label>
              <Input value={`${selectedUjian?.tahunAjaran || ""} - Semester ${selectedUjian?.semester || ""}`} disabled />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenPublishModal(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handlePublishAll}>
              Terbitkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}