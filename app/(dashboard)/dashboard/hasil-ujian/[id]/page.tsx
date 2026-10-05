"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  XCircle,
  Timer,
  Printer,
  Loader2,
  Hourglass,
  PenLine,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Can, useCan } from "@/components/access-provider"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

type StatusPeserta =
  | "Tuntas"
  | "Remedial"
  | "Menunggu Penilaian"
  | "Sedang Mengerjakan"
  | "Belum Dikerjakan"

// Bentuk data dari GET /api/hasil-ujian/[id]
interface Peserta {
  userId: string
  nama: string
  nisn: string
  kelas: string
  percobaanId: string | null
  status: StatusPeserta
  nilai: number | null
  mulai: string | null
  selesai: string | null
}

interface PesertaData {
  ujian: {
    id: string
    namaUjian: string
    mataPelajaran: string
    jenis: string
    kkm: number
    tahunAjaran: string
    semester: string
  }
  kelas: string[]
  peserta: Peserta[]
}

// Bentuk data dari GET /api/hasil-ujian/percobaan/[id]
interface SoalDetail {
  no: number
  soalId: string
  tipe: "PG" | "ESSAI"
  pertanyaan: string
  bobot: number
  isBenar: boolean | null
  nilai: number | null
  catatan: string | null
  jawabanEssai: string
  opsi: { id: string; teks: string; dipilih: boolean; benar: boolean }[]
}

interface PercobaanDetail {
  id: string
  ujian: string
  siswa: { nama: string; nisn: string }
  status: "Berjalan" | "Selesai"
  statusNilai: "Final" | "Menunggu" | null
  isAktif: boolean
  skorPg: number | null
  skorEssai: number | null
  skorMaks: number | null
  nilaiAkhir: number | null
  kkm: number
  mulai: string | null
  selesai: string | null
  soal: SoalDetail[]
}

type SortKey = "nisn" | "nama" | "nilai" | "status"

const RICH_CLASS =
  "[&_p]:m-0 [&_p]:min-h-[1em] [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:p-1.5 [&_th]:p-1.5"

const HEADERS: { key: SortKey; label: string }[] = [
  { key: "nisn", label: "NISN" },
  { key: "nama", label: "Nama Siswa" },
  { key: "nilai", label: "Nilai" },
  { key: "status", label: "Status Hasil" },
]

const ALASAN = [
  { value: "remedial", judul: "Remedial Ujian", ket: "Nilai siswa belum mencapai kriteria ketuntasan (KKM)." },
  { value: "teknis", judul: "Kendala Teknis / Listrik", ket: "Terjadi gangguan jaringan atau mati listrik saat pengerjaan." },
  { value: "kurang_maksimal", judul: "Perbaikan Nilai (Kurang Maksimal)", ket: "Diberikan kesempatan tambahan atas persetujuan pengajar." },
]

const fmtTanggal = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "-"
const fmtJam = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"
const fmtDurasi = (mulai: string | null, selesai: string | null) => {
  if (!mulai || !selesai) return "-"
  const menit = Math.max(0, Math.round((new Date(selesai).getTime() - new Date(mulai).getTime()) / 60000))
  return `${menit} Menit`
}

function StatusBadge({ status }: { status: StatusPeserta }) {
  switch (status) {
    case "Tuntas":
      return (
        <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700 print:border print:border-emerald-600 print:bg-transparent print:text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 print:hidden" /> Tuntas
        </Badge>
      )
    case "Remedial":
      return (
        <Badge className="gap-1 bg-destructive hover:bg-destructive/90 print:border print:border-red-600 print:bg-transparent print:text-red-700">
          <AlertCircle className="h-3.5 w-3.5 print:hidden" /> Remedial
        </Badge>
      )
    case "Menunggu Penilaian":
      return (
        <Badge variant="outline" className="gap-1 border-amber-300 text-amber-600">
          <PenLine className="h-3.5 w-3.5 print:hidden" /> Menunggu Penilaian
        </Badge>
      )
    case "Sedang Mengerjakan":
      return (
        <Badge variant="outline" className="gap-1 border-sky-300 text-sky-600">
          <Hourglass className="h-3.5 w-3.5 print:hidden" /> Sedang Mengerjakan
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
          <Clock className="h-3.5 w-3.5 print:hidden" /> Belum Dikerjakan
        </Badge>
      )
  }
}

export default function DetailHasilUjianPage() {
  const params = useParams()
  const ujianId = params?.id as string
  const queryClient = useQueryClient()
  const pesertaKey = ["hasil-ujian", ujianId]

  const { data, isLoading, error } = useQuery<PesertaData>({
    queryKey: pesertaKey,
    queryFn: () => fetchJson<PesertaData>(`/api/hasil-ujian/${ujianId}`),
    enabled: Boolean(ujianId),
  })

  React.useEffect(() => {
    if (error) toast.error(`Gagal memuat hasil ujian: ${getErrorMessage(error)}`)
  }, [error])

  const [selectedClass, setSelectedClass] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<{ col: SortKey | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const [retakeTarget, setRetakeTarget] = React.useState<Peserta | null>(null)
  const [retakeReason, setRetakeReason] = React.useState("remedial")
  const [detailId, setDetailId] = React.useState<string | null>(null)

  // Kelas pertama dipilih otomatis setelah data datang
  const activeClass = selectedClass ?? data?.kelas[0] ?? null

  const processed = React.useMemo(() => {
    const keyword = search.toLowerCase()
    const result = (data?.peserta ?? []).filter(
      (p) => p.kelas === activeClass && (p.nama.toLowerCase().includes(keyword) || p.nisn.includes(search))
    )

    if (sort.col) {
      const col = sort.col
      result.sort((a, b) => {
        const valA = a[col]
        const valB = b[col]
        if (valA === null) return 1
        if (valB === null) return -1
        const res = typeof valA === "string" ? valA.localeCompare(valB as string) : Number(valA) - Number(valB)
        return sort.dir === "asc" ? res : -res
      })
    }
    return result
  }, [data, activeClass, search, sort])

  const totalPages = Math.ceil(processed.length / pageSize) || 1
  const paginated = processed.slice((page - 1) * pageSize, page * pageSize)

  const retakeMutation = useMutation({
    mutationFn: (input: { percobaanId: string; alasan: string }) =>
      fetchJson(`/api/hasil-ujian/percobaan/${input.percobaanId}/reset`, {
        method: "POST",
        body: { alasan: input.alasan },
      }),
    onSuccess: () => {
      toast.success("Ujian ulang diizinkan. Siswa bisa memasukkan token lagi.")
      setRetakeTarget(null)
      queryClient.invalidateQueries({ queryKey: pesertaKey })
      queryClient.invalidateQueries({ queryKey: ["hasil-ujian"], exact: true })
    },
    onError: (err) => toast.error(`Gagal mengatur ujian ulang: ${getErrorMessage(err)}`),
  })

  const handleSort = (col: SortKey) => {
    setSort((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  return (
    <div className="space-y-4 print:m-0 print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11px !important;
          }
          .no-print,
          aside,
          button,
          .print-hide {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }
          th,
          td {
            padding: 6px 8px !important;
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold print:text-xl">Hasil Ujian</h1>
          <p className="text-sm text-muted-foreground print:text-xs">
            {data ? (
              <>
                <span className="font-semibold text-foreground">{data.ujian.namaUjian}</span> ·{" "}
                {data.ujian.mataPelajaran} · KKM {data.ujian.kkm}
              </>
            ) : (
              "Memuat..."
            )}
          </p>
        </div>

        <Link href="/dashboard/hasil-ujian" className="no-print">
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4" /> Kembali ke Daftar Ujian
          </Button>
        </Link>
      </div>

      <div className="no-print flex flex-col items-center justify-between gap-3 sm:flex-row">
        <Input
          placeholder="Cari NISN atau nama siswa..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={() => window.print()} className="shrink-0 gap-2">
          <Printer className="h-4 w-4" /> Cetak Hasil
        </Button>
      </div>

      <div className="flex flex-col items-stretch gap-4 md:flex-row print:block">
        <aside className="no-print flex w-full shrink-0 flex-col justify-between space-y-2 rounded-md border bg-card p-3 md:w-64">
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
              Pilih Kelas
            </div>
            <div className="space-y-1">
              {(data?.kelas ?? []).map((cls) => {
                const isActive = activeClass === cls
                return (
                  <button
                    key={cls}
                    onClick={() => {
                      setSelectedClass(cls)
                      setPage(1)
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span>{cls}</span>
                    {isActive && <ChevronRight className="h-4 w-4" />}
                  </button>
                )
              })}
              {!isLoading && !data?.kelas.length && (
                <p className="px-2 py-1 text-xs text-muted-foreground">Ujian ini belum punya kelas target.</p>
              )}
            </div>
          </div>
        </aside>

        <div className="print-full-width flex min-h-[420px] flex-1 flex-col justify-between rounded-md border bg-card">
          <div>
            <div className="flex items-center justify-between border-b bg-muted/30 p-3 print:bg-transparent print:p-2">
              <span className="text-sm font-semibold print:text-xs">
                Daftar Siswa Kelas{" "}
                <Badge className="ml-1 print:border print:bg-transparent print:text-black">{activeClass ?? "-"}</Badge>
              </span>
              <span className="text-xs text-muted-foreground">Total: {processed.length} Siswa</span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {HEADERS.map((h) => (
                    <TableHead key={h.key}>
                      <Button variant="ghost" size="sm" onClick={() => handleSort(h.key)} className="no-print -ml-3 h-8">
                        {h.label}
                        {sort.col === h.key ? (
                          sort.dir === "asc" ? (
                            <ArrowUp className="ml-1 h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="ml-1 h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                        )}
                      </Button>
                      <span className="hidden font-semibold print:inline">{h.label}</span>
                    </TableHead>
                  ))}
                  <TableHead className="no-print">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginated.length ? (
                  paginated.map((item, i) => (
                    <TableRow key={item.userId}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{item.nisn}</TableCell>
                      <TableCell className="font-semibold">{item.nama}</TableCell>
                      <TableCell className="font-bold">{item.nilai !== null ? item.nilai : "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="no-print">
                        <div className="flex gap-1.5">
                          {item.percobaanId && item.status !== "Sedang Mengerjakan" && (
                            <Can code="btn-view">
                              <Button size="sm" variant="outline" onClick={() => setDetailId(item.percobaanId)}>
                                <FileText className="mr-1 h-3.5 w-3.5" /> Lihat Hasil
                              </Button>
                            </Can>
                          )}
                          {item.percobaanId && (
                            <Can code="btn-edit">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setRetakeTarget(item)
                                  setRetakeReason("remedial")
                                }}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Ujian Ulang
                              </Button>
                            </Can>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      Data siswa tidak ditemukan di kelas ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="no-print mt-auto flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Baris per halaman</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  if (v) {
                    setPageSize(Number(v))
                    setPage(1)
                  }
                }}
              >
                <SelectTrigger className="h-8 w-[65px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
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

      {/* MODAL UJIAN ULANG */}
      <Dialog
        open={retakeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !retakeMutation.isPending) setRetakeTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" /> Atur Ujian Ulang
            </DialogTitle>
            <DialogDescription>
              Izinkan siswa <strong>{retakeTarget?.nama}</strong> mengerjakan ujian kembali. Hasil sebelumnya
              disimpan sebagai riwayat dan tidak lagi dihitung.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Label className="text-sm font-semibold">Pilih Alasan Ujian Ulang:</Label>
            <RadioGroup value={retakeReason} onValueChange={setRetakeReason} className="space-y-2">
              {ALASAN.map((a) => (
                <div key={a.value} className="flex cursor-pointer items-start space-x-3 rounded-md border p-3 hover:bg-muted/50">
                  <RadioGroupItem value={a.value} id={`alasan-${a.value}`} className="mt-1" />
                  <div className="space-y-0.5">
                    <Label htmlFor={`alasan-${a.value}`} className="cursor-pointer font-semibold">
                      {a.judul}
                    </Label>
                    <p className="text-xs text-muted-foreground">{a.ket}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRetakeTarget(null)} disabled={retakeMutation.isPending}>
              Batal
            </Button>
            <Button
              disabled={retakeMutation.isPending || !retakeTarget?.percobaanId}
              onClick={() => {
                if (retakeTarget?.percobaanId) {
                  retakeMutation.mutate({ percobaanId: retakeTarget.percobaanId, alasan: retakeReason })
                }
              }}
            >
              {retakeMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
              ) : (
                "Konfirmasi & Izinkan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL LEMBAR JAWABAN + PENILAIAN ESSAI */}
      <DetailDialog
        percobaanId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={() => {
          queryClient.invalidateQueries({ queryKey: pesertaKey })
          queryClient.invalidateQueries({ queryKey: ["hasil-ujian"], exact: true })
        }}
      />
    </div>
  )
}

function DetailDialog({
  percobaanId,
  onClose,
  onChanged,
}: {
  percobaanId: string | null
  onClose: () => void
  onChanged: () => void
}) {
  const queryClient = useQueryClient()
  const can = useCan()
  const boleh = can("btn-edit")
  const key = ["hasil-ujian", "percobaan", percobaanId]

  const { data, isLoading, error } = useQuery<PercobaanDetail>({
    queryKey: key,
    queryFn: () => fetchJson<PercobaanDetail>(`/api/hasil-ujian/percobaan/${percobaanId}`),
    enabled: percobaanId !== null,
    // Selalu ambil data segar: nilai bisa berubah dari tab lain
    staleTime: 0,
  })

  const nilaiMutation = useMutation({
    mutationFn: (input: { soalId: string; nilai: number; catatan: string }) =>
      fetchJson<PercobaanDetail>(`/api/hasil-ujian/percobaan/${percobaanId}/nilai`, {
        method: "PUT",
        body: input,
      }),
    onSuccess: (next) => {
      toast.success("Nilai essai disimpan")
      queryClient.setQueryData(key, next)
      onChanged()
    },
    onError: (err) => toast.error(`Gagal menyimpan nilai: ${getErrorMessage(err)}`),
  })

  const belumDinilai = data?.soal.filter((s) => s.tipe === "ESSAI" && s.nilai === null).length ?? 0

  return (
    <Dialog open={percobaanId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Rincian Hasil Pengerjaan
          </DialogTitle>
          <DialogDescription>
            Lembar jawaban siswa <strong>{data?.siswa.nama ?? "..."}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            {error ? getErrorMessage(error) : <><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</>}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-muted/40 p-3.5 text-xs">
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Tanggal
                </span>
                <p className="font-semibold text-foreground">{fmtTanggal(data.mulai)}</p>
              </div>
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Waktu Pengerjaan
                </span>
                <p className="font-semibold text-foreground">
                  {fmtJam(data.mulai)} - {fmtJam(data.selesai)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <Timer className="h-3.5 w-3.5 text-primary" /> Durasi
                </span>
                <p className="font-semibold text-foreground">{fmtDurasi(data.mulai, data.selesai)}</p>
              </div>
              <div className="space-y-1">
                <span className="block font-medium text-muted-foreground">Nilai Akhir & Status</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-foreground">{data.nilaiAkhir ?? "-"}</span>
                  {data.statusNilai === "Menunggu" ? (
                    <StatusBadge status="Menunggu Penilaian" />
                  ) : data.nilaiAkhir !== null ? (
                    <StatusBadge status={data.nilaiAkhir >= data.kkm ? "Tuntas" : "Remedial"} />
                  ) : null}
                </div>
              </div>
              <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-muted-foreground">
                <span>Pilihan ganda: <b className="text-foreground">{data.skorPg ?? 0}</b></span>
                <span>Essai: <b className="text-foreground">{data.skorEssai ?? 0}</b></span>
                <span>Total bobot: <b className="text-foreground">{data.skorMaks ?? 0}</b></span>
                <span>KKM: <b className="text-foreground">{data.kkm}</b></span>
              </div>
            </div>

            {belumDinilai > 0 && (
              <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                <PenLine className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {belumDinilai} soal essai belum dinilai. Nilai akhir muncul setelah semua essai dinilai.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="flex items-center justify-between border-b pb-2 text-sm font-semibold">
                <span>Daftar Jawaban Siswa</span>
                <span className="text-xs font-normal text-muted-foreground">Total: {data.soal.length} Soal</span>
              </h3>

              {data.soal.map((soal) => (
                <SoalCard
                  key={soal.soalId}
                  soal={soal}
                  boleh={boleh && data.isAktif}
                  menyimpan={nilaiMutation.isPending}
                  onSimpan={(nilai, catatan) =>
                    nilaiMutation.mutate({ soalId: soal.soalId, nilai, catatan })
                  }
                />
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Tutup Detail</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SoalCard({
  soal,
  boleh,
  menyimpan,
  onSimpan,
}: {
  soal: SoalDetail
  boleh: boolean
  menyimpan: boolean
  onSimpan: (nilai: number, catatan: string) => void
}) {
  const [nilai, setNilai] = React.useState(soal.nilai === null ? "" : String(soal.nilai))
  const [catatan, setCatatan] = React.useState(soal.catatan ?? "")
  const [error, setError] = React.useState<string | null>(null)

  const simpan = () => {
    const angka = Number(nilai)
    if (nilai.trim() === "" || !Number.isFinite(angka) || angka < 0 || angka > soal.bobot) {
      setError(`Isi nilai antara 0 sampai ${soal.bobot}.`)
      return
    }
    setError(null)
    onSimpan(angka, catatan)
  }

  return (
    <div className="space-y-2 rounded-md border bg-card p-3.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground">Soal No. {soal.no}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Poin: {soal.nilai ?? "-"} / {soal.bobot}
          </Badge>
          {soal.tipe === "PG" ? (
            soal.isBenar ? (
              <Badge className="gap-1 bg-emerald-600 text-[10px]">
                <CheckCircle2 className="h-3 w-3" /> Benar
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <XCircle className="h-3 w-3" /> Salah
              </Badge>
            )
          ) : soal.nilai === null ? (
            <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-600">Belum dinilai</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Essai</Badge>
          )}
        </div>
      </div>

      <div
        className={`font-medium leading-relaxed text-foreground ${RICH_CLASS}`}
        dangerouslySetInnerHTML={{ __html: soal.pertanyaan }}
      />

      {soal.tipe === "PG" ? (
        <div className="grid gap-1.5 rounded bg-muted/40 p-2.5">
          {soal.opsi.map((o, i) => (
            <div
              key={o.id}
              className={`flex items-center gap-2 rounded border px-2.5 py-1.5 ${
                o.benar
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : o.dipilih
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "bg-background"
              }`}
            >
              <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
              <span className="flex-1">{o.teks}</span>
              {o.dipilih && <Badge variant="outline" className="text-[10px]">Dipilih siswa</Badge>}
              {o.benar && <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">Kunci</Badge>}
            </div>
          ))}
          {!soal.opsi.some((o) => o.dipilih) && (
            <span className="italic text-muted-foreground">Siswa tidak menjawab soal ini.</span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded bg-muted/40 p-2.5">
            <span className="block text-[11px] text-muted-foreground">Jawaban Siswa:</span>
            {soal.jawabanEssai.trim() ? (
              <p className="whitespace-pre-wrap font-semibold text-foreground">{soal.jawabanEssai}</p>
            ) : (
              <p className="italic text-muted-foreground">Tidak dijawab.</p>
            )}
          </div>

          {boleh ? (
            <div className="space-y-2 rounded border border-dashed p-2.5">
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Nilai (0 - {soal.bobot})</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={soal.bobot}
                    step={0.5}
                    value={nilai}
                    onChange={(e) => {
                      setNilai(e.target.value)
                      setError(null)
                    }}
                    className="h-8 w-24"
                    disabled={menyimpan}
                  />
                </div>
                <Button size="sm" onClick={simpan} disabled={menyimpan}>
                  {menyimpan ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simpan Nilai"}
                </Button>
              </div>
              <Textarea
                placeholder="Catatan untuk siswa (opsional)"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="min-h-[56px] text-xs"
                maxLength={1000}
                disabled={menyimpan}
              />
              {error && <p className="text-destructive">{error}</p>}
            </div>
          ) : (
            soal.catatan && (
              <p className="text-muted-foreground">
                Catatan guru: <span className="text-foreground">{soal.catatan}</span>
              </p>
            )
          )}
        </div>
      )}
    </div>
  )
}
