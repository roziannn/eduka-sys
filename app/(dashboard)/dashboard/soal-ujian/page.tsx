"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Eye,
  Copy,
  Loader2,
  KeyRound,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  token: string | null
  tokenOpen: boolean
  tokenExpiresAt: string | null
}

type SortKey = "nama" | "mapel" | "jenis" | "kelas" | "tahunAjaran" | "semester" | "status"

const UJIAN_KEY = ["soal-ujian"]
const FORM_PATH = "/dashboard/soal-ujian/create"
const PREVIEW_PATH = "/dashboard/soal-ujian/create/preview-soal"

// Nilai khusus untuk "tanpa filter"
const ALL = "ALL"

// Jumlah badge kelas yang tampil langsung, sisanya diringkas jadi "+N"
const MAX_KELAS_BADGE = 2

// Pilihan batas waktu pintu masuk saat membuka akses ujian
const UNLIMITED = "UNLIMITED"
const BUKA_OPTIONS: { value: string; label: string }[] = [
  { value: "15", label: "15 menit" },
  { value: "30", label: "30 menit" },
  { value: "60", label: "60 menit" },
  { value: "90", label: "90 menit" },
  { value: "120", label: "120 menit" },
  { value: UNLIMITED, label: "Tanpa batas" },
]

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

const formatJam = (date: Date) =>
  date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

// Tampilkan 2 karakter pertama, sisanya bintang. Contoh: "AB3K9X" menjadi "AB****"
const maskToken = (token: string) =>
  token.slice(0, 2) + "*".repeat(Math.max(token.length - 2, 0))

// Badge kelas: maksimal MAX_KELAS_BADGE yang tampil, sisanya jadi "+N".
// Nama kelas yang tersembunyi muncul saat kursor diarahkan ke badge "+N".
function KelasBadges({ kelas }: { kelas: string[] }) {
  if (kelas.length === 0) return <>-</>

  const tampil = kelas.slice(0, MAX_KELAS_BADGE)
  const sisa = kelas.slice(MAX_KELAS_BADGE)

  return (
    <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
      {tampil.map((k) => (
        <Badge
          key={k}
          variant="secondary"
          className="text-[11px] font-medium bg-blue-100/50 text-foreground hover:bg-muted border"
        >
          {k}
        </Badge>
      ))}
      {sisa.length > 0 && (
        <Badge
          variant="outline"
          className="text-[11px] font-medium cursor-help"
          title={sisa.join(", ")}
          aria-label={`${sisa.length} kelas lainnya: ${sisa.join(", ")}`}
        >
          +{sisa.length}
        </Badge>
      )}
    </div>
  )
}

export default function SoalUjianPage() {
  const queryClient = useQueryClient()

  // Filter & Search States
  const [tahunAjaran, setTahunAjaran] = React.useState("")
  const [semester, setSemester] = React.useState("")
  const [search, setSearch] = React.useState("")

  // Sort State
  const [sort, setSort] = React.useState<{ col: SortKey | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })

  // Pagination State
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // Dialog buka akses: ujian yang akan dibuka (null = dialog tertutup) dan pilihan batas waktunya
  const [bukaItem, setBukaItem] = React.useState<SoalUjian | null>(null)
  const [bukaDurasi, setBukaDurasi] = React.useState("30")

  // ---------- DATA ----------
  const {
    data: ujianData = [],
    isLoading: ujianLoading,
    error: ujianError,
  } = useQuery<SoalUjian[]>({
    queryKey: [...UJIAN_KEY, "list"],
    queryFn: () => fetchJson<SoalUjian[]>("/api/soal-ujian"),
    // Muat ulang tiap 30 detik, supaya saklar ikut mati saat batas waktu token lewat
    refetchInterval: 30_000,
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

  // Buka atau tutup akses ujian (token)
  const toggleMutation = useMutation({
    mutationFn: (input: { id: string; open: boolean; expiresInMinutes?: number }) =>
      fetchJson(`/api/soal-ujian/${input.id}/token`, {
        method: "PATCH",
        body: { open: input.open, expiresInMinutes: input.expiresInMinutes },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: UJIAN_KEY }),
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

  // ---------- AKSES UJIAN ----------
  // Menyalakan saklar membuka dialog (pilih batas waktu). Mematikan langsung menutup akses.
  const handleToggleAkses = (item: SoalUjian, open: boolean) => {
    if (open) {
      setBukaDurasi("30")
      setBukaItem(item)
      return
    }

    toggleMutation.mutate(
      { id: item.id, open: false },
      {
        onSuccess: () => toast.success(`Ujian "${item.nama}" ditutup.`),
        onError: (err) => toast.error(`Gagal menutup akses ujian: ${getErrorMessage(err)}`),
      }
    )
  }

  const handleConfirmBuka = () => {
    if (!bukaItem) return
    const item = bukaItem

    toggleMutation.mutate(
      {
        id: item.id,
        open: true,
        expiresInMinutes: bukaDurasi === UNLIMITED ? undefined : Number(bukaDurasi),
      },
      {
        onSuccess: () => {
          toast.success(`Ujian "${item.nama}" dibuka. Siswa bisa masuk dengan token.`)
          setBukaItem(null)
        },
        onError: (err) => toast.error(`Gagal membuka akses ujian: ${getErrorMessage(err)}`),
      }
    )
  }

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      toast.success(`Token ${token} disalin.`)
    } catch {
      toast.error("Gagal menyalin token.")
    }
  }

  // ---------- OPSI FILTER ----------
  const tahunOptions = Array.from(new Set(referensi?.tahunAjaran.map((t) => t.tahun) ?? []))

  // Semester yang tersedia: untuk tahun terpilih, atau semua semester kalau tahun = Semua
  const semesterOptions = Array.from(
    new Set(
      (referensi?.tahunAjaran ?? [])
        .filter((t) => tahunAjaran === ALL || !tahunAjaran || t.tahun === tahunAjaran)
        .map((t) => t.semester)
    )
  )

  // Ganti tahun ajaran: kalau semester terpilih tidak ada di tahun itu, kembali ke Semua
  const handleTahunChange = (tahun: string) => {
    const semesters = Array.from(
      new Set(
        (referensi?.tahunAjaran ?? [])
          .filter((t) => tahun === ALL || t.tahun === tahun)
          .map((t) => t.semester)
      )
    )

    setTahunAjaran(tahun)
    setSemester((prev) => (prev === ALL || semesters.includes(prev) ? prev : ALL))
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
        (!tahunAjaran || tahunAjaran === ALL || item.tahunAjaran === tahunAjaran) &&
        (!semester || semester === ALL || item.semester === semester) &&
        (item.nama.toLowerCase().includes(keyword) ||
          item.mapel.toLowerCase().includes(keyword) ||
          item.jenis.toLowerCase().includes(keyword) ||
          item.status.toLowerCase().includes(keyword) ||
          (item.token ?? "").toLowerCase().includes(keyword) ||
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
  // currentPage dibatasi ke totalPages, supaya tidak kosong kalau data berkurang
  const totalPages = Math.ceil(processedData.length / pageSize) || 1
  const currentPage = Math.min(page, totalPages)
  const paginatedData = processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const tableLoading = ujianLoading || referensiLoading

  // Perkiraan jam pintu ditutup, ditampilkan di dialog (hanya dihitung saat dialog terbuka)
  const perkiraanTutup =
    bukaItem && bukaDurasi !== UNLIMITED
      ? formatJam(new Date(Date.now() + Number(bukaDurasi) * 60_000))
      : null

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
          placeholder="Cari nama ujian, mapel, jenis, status, token, atau kelas..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={tahunAjaran} onValueChange={(val) => val && handleTahunChange(val)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tahun Ajaran">
                {tahunAjaran === ALL ? "Semua Tahun" : tahunAjaran || "Tahun Ajaran"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Tahun</SelectItem>
              {tahunOptions.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={semester} onValueChange={(val) => val && handleSemesterChange(val)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Semester">
                {semester === ALL ? "Semua Semester" : semester || "Semester"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Semester</SelectItem>
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
              <TableHead>Token</TableHead>
              <TableHead>Akses</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length ? (
              paginatedData.map((item, i) => {
                // Saklar baris ini sedang diproses, atau ujiannya Draft (belum boleh dibuka).
                // Ujian Draft yang aksesnya masih terbuka tetap bisa ditutup.
                const rowPending =
                  toggleMutation.isPending && toggleMutation.variables?.id === item.id
                const belumBisaDibuka = item.status !== "Siap Ujian" && !item.tokenOpen

                return (
                  <TableRow key={item.id}>
                    <TableCell>{(currentPage - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="font-semibold">{item.nama}</TableCell>
                    <TableCell>{item.mapel}</TableCell>
                    <TableCell><Badge variant="outline">{item.jenis}</Badge></TableCell>

                    {/* BADGE KELAS: maksimal 2, sisanya "+N" */}
                    <TableCell>
                      <KelasBadges kelas={item.kelas} />
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

                    {/* TOKEN + TOMBOL SALIN */}
                    <TableCell>
                    {item.token ? (
                      item.tokenOpen ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="font-bold">
                            {item.token}
                          </Badge>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Salin token"
                            onClick={() => handleCopyToken(item.token!)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="font-bold text-muted-foreground"
                          title="Buka akses untuk melihat token"
                        >
                          {maskToken(item.token)}
                        </Badge>
                      )
                    ) : (
                      "-"
                    )}
                  </TableCell>

                    {/* SAKLAR BUKA / TUTUP AKSES */}
                    <TableCell>
                      <div
                        className="flex items-center gap-2"
                        title={belumBisaDibuka ? "Terbitkan ujian dulu untuk membuka akses" : undefined}
                      >
                        <Switch
                          checked={item.tokenOpen}
                          disabled={!item.token || belumBisaDibuka || rowPending}
                          onCheckedChange={(open) => handleToggleAkses(item, open)}
                        />
                        <div className="leading-tight">
                          <span
                            className={`block text-xs ${
                              item.tokenOpen ? "text-emerald-600 font-medium" : "text-muted-foreground"
                            }`}
                          >
                            {item.tokenOpen ? "Dibuka" : "Ditutup"}
                          </span>
                          {item.tokenOpen && (
                            <span className="block text-[11px] text-muted-foreground">
                              {item.tokenExpiresAt
                                ? `Sampai ${formatJam(new Date(item.tokenExpiresAt))}`
                                : "Tanpa batas"}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`${PREVIEW_PATH}?id=${item.id}`}
                          target="_blank"
                          rel="noopener"
                          className={buttonVariants({ variant: "outline", size: "icon", className: "h-8 w-8 text-foreground" })}
                          title="Preview Soal"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
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
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
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
            <span>Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG BUKA AKSES UJIAN */}
      <Dialog
        open={bukaItem !== null}
        onOpenChange={(open) => {
          // Dialog tidak bisa ditutup selagi permintaan buka akses berjalan
          if (!open && !toggleMutation.isPending) setBukaItem(null)
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Buka Akses Ujian
            </DialogTitle>
            <DialogDescription>
              {bukaItem?.nama}. Siswa bisa masuk dengan token{" "}
              <strong className="font-mono tracking-wider text-foreground">{bukaItem?.token}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <Label>Pintu masuk dibuka selama</Label>
            <div className="grid grid-cols-3 gap-2">
              {BUKA_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={bukaDurasi === opt.value ? "default" : "outline"}
                  onClick={() => setBukaDurasi(opt.value)}
                  disabled={toggleMutation.isPending}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {perkiraanTutup
                ? `Siswa yang baru masuk setelah sekitar pukul ${perkiraanTutup} akan ditolak. `
                : "Pintu terbuka sampai Anda menutupnya sendiri. "}
              Siswa yang sudah mengerjakan tetap lanjut sampai waktu ujiannya
              ({bukaItem?.durasiMenit} menit) habis.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBukaItem(null)}
              disabled={toggleMutation.isPending}
            >
              Batal
            </Button>
            <Button onClick={handleConfirmBuka} disabled={toggleMutation.isPending}>
              {toggleMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membuka...</>
              ) : (
                "Buka Akses"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}