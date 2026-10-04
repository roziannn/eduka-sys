"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Timer,
  CheckCircle2,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"
import type { ReferensiUjian, UjianDetail } from "@/types/soal-ujian"

// --- BENTUK DATA YANG DITAMPILKAN (sama untuk sumber database dan form) ---
interface OpsiJawaban {
  id: string
  teks: string
  isBenar: boolean
}

interface SoalItem {
  id: string
  pertanyaan: string // HTML dari editor teks
  tipe: "Pilihan Ganda" | "Essai"
  bobot: number
  isMultipleChoice: boolean
  opsi: OpsiJawaban[]
}

interface PreviewData {
  namaUjian: string
  mataPelajaran: string
  jenisUjian: string
  kelas: string[]
  tahunAjaran: string
  semester: string
  durasiMenit: number
  kkm: number
  soalList: SoalItem[]
}

const UJIAN_KEY = ["soal-ujian"]
const LIST_PATH = "/dashboard/soal-ujian"

// Gaya tampilan HTML dari editor teks
const RICH_CLASS =
  "[&_p]:m-0 [&_p]:min-h-[1em] [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:p-2 [&_th]:p-2 [&_th]:bg-muted/40"

const stripHtml = (html: string) =>
  html?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() || ""

// Ada isi kalau ada teks atau minimal satu gambar
const hasContent = (html: string) => stripHtml(html).length > 0 || /<img\b/i.test(html ?? "")

// --- SUMBER 1: UJIAN TERSIMPAN (database) ---
function fromDetail(detail: UjianDetail, referensi: ReferensiUjian): PreviewData {
  return {
    namaUjian: detail.nama,
    mataPelajaran: referensi.mapel.find((m) => m.id === detail.mapelId)?.nama ?? "-",
    jenisUjian: detail.jenis,
    kelas: referensi.kelas
      .filter((k) => detail.kelasIds.includes(k.id))
      .map((k) => k.namaKelas),
    tahunAjaran: detail.tahunAjaran,
    semester: detail.semester,
    durasiMenit: detail.durasiMenit,
    kkm: detail.kkm,
    soalList: [...detail.soal]
      .sort((a, b) => a.seq - b.seq)
      .map(
        (s): SoalItem => ({
          id: s.id,
          pertanyaan: s.pertanyaan,
          tipe: s.tipe === "PG" ? "Pilihan Ganda" : "Essai",
          bobot: s.bobot,
          isMultipleChoice: !!s.multiJawaban,
          opsi: [...(s.opsi ?? [])]
            .sort((a, b) => a.seq - b.seq)
            .map((o) => ({ id: o.id, teks: o.teks, isBenar: o.benar })),
        })
      ),
  }
}

// --- SUMBER 2: FORM YANG BELUM DISIMPAN (sessionStorage) ---
interface SessionSoal {
  id: string
  pertanyaan?: string
  tipe: "Pilihan Ganda" | "Essai"
  bobot?: number
  isMultipleChoice?: boolean
  opsi?: { id: number | string; teks?: string; isBenar?: boolean }[]
}

interface SessionData {
  namaUjian?: string
  mataPelajaran?: string
  jenisUjian?: string
  targetKelas?: string[]
  tahunAjaran?: string
  semester?: string
  durasiMenit?: number
  kkm?: number
  soalList?: SessionSoal[]
}

function fromSession(): PreviewData | null {
  const raw = sessionStorage.getItem("previewUjianData")
  if (!raw) return null

  try {
    const d = JSON.parse(raw) as SessionData

    return {
      namaUjian: d.namaUjian ?? "",
      mataPelajaran: d.mataPelajaran || "-",
      jenisUjian: d.jenisUjian ?? "-",
      kelas: d.targetKelas ?? [],
      tahunAjaran: d.tahunAjaran ?? "-",
      semester: d.semester ?? "-",
      durasiMenit: d.durasiMenit || 90,
      kkm: d.kkm ?? 0,
      soalList: (d.soalList ?? []).map(
        (s): SoalItem => ({
          id: s.id,
          pertanyaan: s.pertanyaan ?? "",
          tipe: s.tipe,
          bobot: s.bobot ?? 0,
          isMultipleChoice: !!s.isMultipleChoice,
          opsi: (s.opsi ?? []).map((o) => ({
            id: String(o.id),
            teks: o.teks ?? "",
            isBenar: !!o.isBenar,
          })),
        })
      ),
    }
  } catch (err) {
    console.error("Gagal membaca data preview:", err)
    return null
  }
}

// Soal dianggap terisi kalau pertanyaan ada, dan (untuk PG) semua opsi terisi serta ada kunci jawaban.
// Sama dengan aturan saat Terbitkan.
const isSoalTerisi = (soal: SoalItem) => {
  if (!hasContent(soal.pertanyaan)) return false
  if (soal.tipe === "Pilihan Ganda") {
    return (
      soal.opsi.length > 0 &&
      soal.opsi.every((o) => o.teks.trim() !== "") &&
      soal.opsi.some((o) => o.isBenar)
    )
  }
  return true
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// Halaman ini sering dibuka di tab baru, jadi "kembali" menutup tab kalau tidak ada riwayat
function useGoBack() {
  const router = useRouter()

  return React.useCallback(() => {
    if (window.history.length > 1) {
      router.back()
    } else {
      window.close()
    }
  }, [router])
}

// Suspense wajib karena PreviewRoot memakai useSearchParams
export default function PreviewUjianPage() {
  return (
    <React.Suspense fallback={<LoadingState text="Memuat preview..." />}>
      <PreviewRoot />
    </React.Suspense>
  )
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 min-h-[60vh] text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {text}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  const goBack = useGoBack()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={goBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
      </Button>
    </div>
  )
}

// Menentukan sumber data: ada ?id=... berarti ujian tersimpan, tanpa id berarti data dari form
function PreviewRoot() {
  const searchParams = useSearchParams()
  const ujianId = searchParams.get("id")

  if (ujianId) return <SavedPreview key={ujianId} ujianId={ujianId} />
  return <DraftPreview />
}

// Preview ujian yang sudah tersimpan
function SavedPreview({ ujianId }: { ujianId: string }) {
  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery<UjianDetail>({
    queryKey: [...UJIAN_KEY, "preview", ujianId],
    queryFn: () => fetchJson<UjianDetail>(`/api/soal-ujian/${ujianId}`),
    // Selalu ambil data segar, supaya preview sama dengan yang tersimpan
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })

  // Key yang sama dengan halaman lain, jadi cache-nya dipakai bersama
  const {
    data: referensi,
    isLoading: referensiLoading,
    error: referensiError,
  } = useQuery<ReferensiUjian>({
    queryKey: [...UJIAN_KEY, "referensi"],
    queryFn: () => fetchJson<ReferensiUjian>("/api/soal-ujian/referensi"),
  })

  if (detailLoading || referensiLoading) return <LoadingState text="Memuat ujian..." />

  const error = detailError ?? referensiError
  if (error) return <EmptyState message={`Gagal memuat ujian: ${getErrorMessage(error)}`} />
  if (!detail || !referensi) return <EmptyState message="Ujian tidak ditemukan." />

  return <PreviewView data={fromDetail(detail, referensi)} />
}

// Preview dari form yang belum disimpan (data dititipkan lewat sessionStorage)
function DraftPreview() {
  // undefined = belum dibaca (sessionStorage hanya ada di browser), null = tidak ada data
  const [data, setData] = React.useState<PreviewData | null | undefined>(undefined)

  React.useEffect(() => {
    setData(fromSession())
  }, [])

  if (data === undefined) return <LoadingState text="Memuat preview..." />
  if (data === null) return <EmptyState message="Tidak ada data preview yang ditemukan." />

  return <PreviewView data={data} />
}

// Tampilan preview. Dibuat setelah data siap, jadi state awal (timer) langsung benar.
function PreviewView({ data }: { data: PreviewData }) {
  const goBack = useGoBack()

  // State Indeks Soal Aktif
  const [currentIndex, setCurrentIndex] = React.useState<number>(0)

  // State Simulasi Timer
  const [timeLeft, setTimeLeft] = React.useState<number>(() => data.durasiMenit * 60)

  // Satu interval selama halaman terbuka (tidak dibuat ulang tiap detik)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const totalSoal = data.soalList.length
  const totalTerisi = data.soalList.filter(isSoalTerisi).length
  const currentSoal = data.soalList[currentIndex]
  const currentTerisi = currentSoal ? isSoalTerisi(currentSoal) : false

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-lg bg-card px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
              <div className="flex items-start gap-3">
                <Button size="icon" variant="outline" onClick={goBack} title="Kembali">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{data.namaUjian || "Nama Ujian Belum Diisi"}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mata Pelajaran: <span className="font-semibold text-foreground">{data.mataPelajaran}</span>
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1 w-fit">
                {data.jenisUjian}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-4">
              <div>
                <span className="text-muted-foreground block text-xs">Target Kelas</span>
                <span className="font-semibold">{data.kelas.length ? data.kelas.join(", ") : "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Tahun Ajaran</span>
                <span className="font-semibold">{data.tahunAjaran} ({data.semester})</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Durasi Waktu</span>
                <span className="font-semibold">{data.durasiMenit} Menit</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">KKM / Total Soal</span>
                <span className="font-semibold">{data.kkm} / {totalSoal} Soal</span>
              </div>
            </div>
          </div>

          {/* Single Card Soal Aktif */}
          {currentSoal ? (
            <div className="border rounded-lg bg-card p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-primary">
                    Soal Nomor {currentIndex + 1}
                  </span>
                  {currentTerisi ? (
                    <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 text-[11px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Terisi
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-800 text-[11px] gap-1">
                      <CircleDashed className="h-3 w-3" /> Belum Lengkap
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{currentSoal.tipe}</Badge>
                  {currentSoal.tipe === "Pilihan Ganda" && (
                    <Badge variant="outline" className="text-[10px]">
                      {currentSoal.isMultipleChoice ? "Jawaban Banyak" : "1 Jawaban"}
                    </Badge>
                  )}
                  <Badge variant="outline">Bobot: {currentSoal.bobot}</Badge>
                </div>
              </div>

              {/* Pertanyaan: HTML dari editor teks */}
              {hasContent(currentSoal.pertanyaan) ? (
                <div
                  className={`text-base font-medium leading-relaxed min-h-[60px] ${RICH_CLASS}`}
                  dangerouslySetInnerHTML={{ __html: currentSoal.pertanyaan }}
                />
              ) : (
                <p className="text-base leading-relaxed min-h-[60px] italic text-muted-foreground">
                  (Pertanyaan belum diisi)
                </p>
              )}

              {/* Opsi Pilihan Ganda */}
              {currentSoal.tipe === "Pilihan Ganda" && (
                <div className="grid gap-3 pt-2">
                  {currentSoal.opsi.map((opsi, oIdx) => {
                    const labelOpsi = String.fromCharCode(65 + oIdx)
                    return (
                      <div
                        key={opsi.id}
                        className={`flex items-center gap-3 p-3.5 rounded-md border text-sm transition-colors ${
                          opsi.isBenar
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium"
                            : "bg-background"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            opsi.isBenar
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {labelOpsi}
                        </span>
                        <span className="flex-1">
                          {opsi.teks || <span className="italic text-muted-foreground">(Opsi belum diisi)</span>}
                        </span>
                        {opsi.isBenar && (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                            Kunci Jawaban
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Input Essai */}
              {currentSoal.tipe === "Essai" && (
                <div className="pt-2">
                  <Textarea
                    placeholder="Area jawaban siswa..."
                    disabled
                    className="bg-muted/20 cursor-not-allowed min-h-[120px]"
                  />
                </div>
              )}

              {/* Tombol Navigasi Sebelumnya / Selanjutnya */}
              <div className="flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Sebelumnya
                </Button>

                <span className="text-xs text-muted-foreground font-medium">
                  Halaman {currentIndex + 1} dari {totalSoal}
                </span>

                <Button
                  onClick={() => setCurrentIndex((prev) => Math.min(totalSoal - 1, prev + 1))}
                  disabled={currentIndex === totalSoal - 1}
                >
                  Selanjutnya <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg bg-card p-10 text-center text-sm text-muted-foreground">
              Ujian ini belum memiliki butir soal.
            </div>
          )}
        </div>

        {/* Kolom Kanan: Sidebar Sticky (Timer & Navigasi Kotak) */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-4 print:hidden">
          {/* Card Timer */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Timer className="h-4 w-4" /> Sisa Waktu Ujian
                </span>
                <Badge variant="outline" className="font-mono text-xs">
                  {data.durasiMenit} Menit
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-extrabold tracking-wider font-mono text-primary">
                {formatTime(timeLeft)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Waktu berjalan secara real-time selama simulasi.
              </p>
            </CardContent>
          </Card>

          {/* Card Navigasi Kotak Soal */}
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Navigasi Soal</CardTitle>
                <span className="text-xs text-muted-foreground font-medium">
                  {totalTerisi} / {totalSoal} Terisi
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
              {/* Indicator Legend */}
              <div className="flex items-center justify-around text-xs border-b pb-3 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-600 inline-block" />
                  <span>Sudah Diisi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-muted border border-border inline-block" />
                  <span>Belum Diisi</span>
                </div>
              </div>

              {/* Grid Kotak Soal 5 Kolom dengan Scrollbar Tipis */}
              <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {data.soalList.map((soal, sIdx) => {
                  const terisi = isSoalTerisi(soal)
                  const isActive = sIdx === currentIndex

                  return (
                    <button
                      key={soal.id}
                      type="button"
                      onClick={() => setCurrentIndex(sIdx)}
                      className={`h-10 w-full rounded-md font-semibold text-xs transition-all flex items-center justify-center border ${
                        isActive
                          ? "border-2 border-primary font-bold shadow-sm"
                          : ""
                      } ${
                        terisi
                          ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
                      }`}
                      title={`Soal No. ${sIdx + 1} (${terisi ? "Sudah Diisi" : "Belum Diisi"})`}
                    >
                      {sIdx + 1}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}