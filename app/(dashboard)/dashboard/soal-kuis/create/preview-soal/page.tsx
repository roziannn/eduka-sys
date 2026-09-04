"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Timer, CheckCircle2, CircleDashed, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OpsiJawaban {
  id: string
  teks: string
  isBenar: boolean
}

interface SoalItem {
  id: string
  pertanyaan: string
  tipe: "Pilihan Ganda" | "Essai"
  bobot: number
  opsi: OpsiJawaban[]
}

interface PreviewData {
  namaUjian: string
  mataPelajaran: string
  jenisUjian: string
  kelas: string
  tahunAjaran: string
  semester: string
  durasiMenit: number
  kkm: number
  soalList: SoalItem[]
}

export default function PreviewUjianPage() {
  const router = useRouter()
  const [data, setData] = React.useState<PreviewData | null>(null)

  // State Indeks Soal Aktif
  const [currentIndex, setCurrentIndex] = React.useState<number>(0)

  // State Simulasi Timer
  const [timeLeft, setTimeLeft] = React.useState<number>(0)

  React.useEffect(() => {
    const rawData = sessionStorage.getItem("previewUjianData")
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData) as PreviewData
        setData(parsed)
        setTimeLeft((parsed.durasiMenit || 90) * 60)
      } catch (err) {
        console.error("Gagal membaca data preview:", err)
      }
    }
  }, [])

  // Effect Countdown Timer
  React.useEffect(() => {
    if (timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Helper Cek apakah soal sudah terisi valid
  const isSoalTerisi = (soal: SoalItem) => {
    if (!soal.pertanyaan || soal.pertanyaan.trim() === "") return false
    if (soal.tipe === "Pilihan Ganda") {
      const adaTeksOpsi = soal.opsi.some((o) => o.teks && o.teks.trim() !== "")
      const adaKunci = soal.opsi.some((o) => o.isBenar)
      return adaTeksOpsi && adaKunci
    }
    return true
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Tidak ada data preview yang ditemukan.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali Ke Form Ujian
        </Button>
      </div>
    )
  }

  const totalSoal = data.soalList.length
  const totalTerisi = data.soalList.filter(isSoalTerisi).length
  const currentSoal = data.soalList[currentIndex]
  const currentTerisi = currentSoal ? isSoalTerisi(currentSoal) : false

  return (
    /* Mengubah max-w-8xl/max-w-5xl menjadi w-full agar layout memenuhi lebar layar */
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-lg bg-card px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
              <div>
                <h1 className="text-xl font-bold">{data.namaUjian || "Nama Ujian Belum Diisi"}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Mata Pelajaran: <span className="font-semibold text-foreground">{data.mataPelajaran}</span>
                </p>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1 w-fit">
                {data.jenisUjian}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-2">
              <div>
                <span className="text-muted-foreground block text-xs">Target Kelas</span>
                <span className="font-semibold">{data.kelas}</span>
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
          {currentSoal && (
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
                  <Badge variant="outline">Bobot: {currentSoal.bobot}</Badge>
                </div>
              </div>

              <p className="text-base font-medium leading-relaxed whitespace-pre-wrap min-h-[60px]">
                {currentSoal.pertanyaan || (
                  <span className="italic text-muted-foreground">(Pertanyaan belum diisi)</span>
                )}
              </p>

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