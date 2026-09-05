"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Plus,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  KeyRound,
  Edit,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  { id: "u-1", namaUjian: "UTS Matematika Wajib X", mataPelajaran: "Matematika", jenisUjian: "UTS", kelas: "X IPA, X IPS", tahunAjaran: "2025/2026", semester: "Genap", jumlahSoal: 30, durasiMenit: 90, token: "MTK10X", status: "Siap Ujian" },
  { id: "u-2", namaUjian: "UAS Fisika Dasar XI", mataPelajaran: "Fisika", jenisUjian: "UAS", kelas: "XI IPA", tahunAjaran: "2025/2026", semester: "Genap", jumlahSoal: 40, durasiMenit: 120, token: "FSK11Z", status: "Draft" },
  { id: "u-3", namaUjian: "UH Bahasa Indonesia X", mataPelajaran: "Bahasa Indonesia", jenisUjian: "UH", kelas: "X IPS", tahunAjaran: "2024/2025", semester: "Ganjil", jumlahSoal: 20, durasiMenit: 45, token: "BIND10", status: "Selesai" },
]

export default function SoalUjianPage() {
  const [ujianData] = React.useState<SoalUjian[]>(initialUjianData)
  const [selectedUjian, setSelectedUjian] = React.useState<SoalUjian | null>(null)
  const [pesertaList] = React.useState<PesertaUjian[]>([])

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

  // Modals state
  const [, setOpenPublishModal] = React.useState(false)
  const [, setOpenAddPesertaModal] = React.useState(false)

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

  const handleBackToUjian = () => {
    setSelectedUjian(null)
    setSearch("")
    setPage(1)
  }

  return (
    <div className="space-y-4">
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
                          ? "Distribusi Kelas"
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
                      
                      {/* TAMPILAN BADGE KELAS MULTIPLE / SINGLE */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {item.kelas.split(",").map((k, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[11px] font-medium bg-blue-100/50 text-foreground hover:bg-muted border"
                            >
                              {k.trim()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

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
                            <Edit className="h-4 w-4" />
                          </Link>
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
    </div>
  )
}