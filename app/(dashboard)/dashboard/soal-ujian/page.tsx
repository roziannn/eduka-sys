"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Loader2,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"
import type { JenisUjian, ReferensiUjian, StatusUjian } from "@/types/soal-ujian"

// --- TYPES ---
// Bentuk data dari GET /api/soal-ujian
interface SoalUjian {
  id: string
  nama: string
  mapel: string
  jenis: JenisUjian
  kelas: string[]
  tahunAjaran: string
  semester: string
  jumlahSoal: number
  durasiMenit: number
  status: StatusUjian
}

type SortKey = "nama" | "mapel" | "jenis" | "kelas" | "tahunAjaran" | "semester" | "status"

const UJIAN_KEY = ["soal-ujian"]
const FORM_PATH = "/dashboard/soal-ujian/create"

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "nama", label: "Nama Ujian" },
  { key: "mapel", label: "Mata Pelajaran" },
  { key: "jenis", label: "Jenis" },
  { key: "kelas", label: "Distribusi Kelas" },
  { key: "tahunAjaran", label: "Tahun Ajaran" },
  { key: "semester", label: "Semester" },
  { key: "status", label: "Status" },
]

// Semua kolom yang bisa diurutkan dibandingkan sebagai teks
const sortValue = (item: SoalUjian, key: SortKey) =>
  key === "kelas" ? item.kelas.join(", ") : String(item[key])

export default function SoalUjianPage() {
  // Filter & Search States
  const [tahunAjaran, setTahunAjaran] = React.useState("")
  const [semester, setSemester] = React.useState("")
  const [search, setSearch] = React.useState("")

  // Sort State
  const [sort, setSort] = React.useState<{ col: SortKey | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })

  // Pagination State
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // ---------- DATA ----------
  const {
    data: ujianData = [],
    isLoading: ujianLoading,
    error: ujianError,
  } = useQuery<SoalUjian[]>({
    queryKey: [...UJIAN_KEY, "list"],
    queryFn: () => fetchJson<SoalUjian[]>("/api/soal-ujian"),
  })

  // Key yang sama dengan halaman form, jadi cache-nya dipakai bersama
  const {
    data: referensi,
    isLoading: referensiLoading,
    error: referensiError,
  } = useQuery<ReferensiUjian>({
    queryKey: [...UJIAN_KEY, "referensi"],
    queryFn: () => fetchJson<ReferensiUjian>("/api/soal-ujian/referensi"),
  })

  React.useEffect(() => {
    if (ujianError) toast.error(`Gagal memuat data ujian: ${getErrorMessage(ujianError)}`)
  }, [ujianError])

  React.useEffect(() => {
    if (referensiError) toast.error(`Gagal memuat data periode: ${getErrorMessage(referensiError)}`)
  }, [referensiError])

  // Default filter: periode yang sedang aktif, kalau tidak ada pakai yang pertama
  const defaultsApplied = React.useRef(false)
  React.useEffect(() => {
    if (!referensi || defaultsApplied.current) return
    defaultsApplied.current = true

    const periode = referensi.tahunAjaran.find((t) => t.isAktif) ?? referensi.tahunAjaran[0]
    if (periode) {
      setTahunAjaran(periode.tahun)
      setSemester(periode.semester)
    }
  }, [referensi])

  const tahunOptions = Array.from(new Set(referensi?.tahunAjaran.map((t) => t.tahun) ?? []))
  const semesterOptions =
    referensi?.tahunAjaran.filter((t) => t.tahun === tahunAjaran).map((t) => t.semester) ?? []

  // Ganti tahun ajaran: semester ikut menyesuaikan dengan yang tersedia untuk tahun itu
  const handleTahunChange = (tahun: string) => {
    const semesters =
      referensi?.tahunAjaran.filter((t) => t.tahun === tahun).map((t) => t.semester) ?? []

    setTahunAjaran(tahun)
    setSemester((prev) => (semesters.includes(prev) ? prev : semesters[0] ?? ""))
    setPage(1)
  }

  const handleSemesterChange = (value: string) => {
    setSemester(value)
    setPage(1)
  }

  // Sort Logic
  const handleSort = (col: SortKey) => {
    setSort((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  // Processed Data
  const processedData = React.useMemo(() => {
    const keyword = search.toLowerCase()

    const result = ujianData.filter(
      (item) =>
        (!tahunAjaran || item.tahunAjaran === tahunAjaran) &&
        (!semester || item.semester === semester) &&
        (item.nama.toLowerCase().includes(keyword) ||
          item.mapel.toLowerCase().includes(keyword) ||
          item.kelas.join(", ").toLowerCase().includes(keyword))
    )

    if (sort.col) {
      const col = sort.col
      result.sort((a, b) => {
        const res = sortValue(a, col).localeCompare(sortValue(b, col))
        return sort.dir === "asc" ? res : -res
      })
    }
    return result
  }, [ujianData, tahunAjaran, semester, search, sort])

  // Pagination Calculations
  const totalPages = Math.ceil(processedData.length / pageSize) || 1
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)

  const tableLoading = ujianLoading || referensiLoading

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Soal Ujian
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola bank soal, jadwal ujian, serta penilaian peserta.
          </p>
        </div>

        <Link
          href={FORM_PATH}
          className={buttonVariants({ variant: "default" })}
        >
          <Plus className="h-4 w-4" /> Buat Ujian Baru
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          placeholder="Cari nama ujian, mapel, atau kelas..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={tahunAjaran} onValueChange={(val) => val && handleTahunChange(val)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tahun Ajaran" />
            </SelectTrigger>
            <SelectContent>
              {tahunOptions.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={semester} onValueChange={(val) => val && handleSemesterChange(val)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              {semesterOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table Container */}
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
            {tableLoading ? (
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
                  <TableCell className="font-semibold">{item.nama}</TableCell>
                  <TableCell>{item.mapel}</TableCell>
                  <TableCell><Badge variant="outline">{item.jenis}</Badge></TableCell>

                  {/* TAMPILAN BADGE KELAS MULTIPLE / SINGLE */}
                  <TableCell>
                    {item.kelas.length ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {item.kelas.map((k) => (
                          <Badge
                            key={k}
                            variant="secondary"
                            className="text-[11px] font-medium bg-blue-100/50 text-foreground hover:bg-muted border"
                          >
                            {k}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell>{item.tahunAjaran}</TableCell>
                  <TableCell>{item.semester}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === "Siap Ujian" ? "default" : "outline"}
                      className={
                        item.status === "Siap Ujian"
                          ? "bg-emerald-600"
                          : "text-amber-600 border-amber-300"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`${FORM_PATH}?id=${item.id}`}
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
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Data ujian tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
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