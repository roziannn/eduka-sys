"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  KeyRound,
  Timer,
  CheckCircle2,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"
import type {
  HasilUjian,
  JawabanSiswa,
  MasukUjianResult,
  PercobaanSiswa,
  SoalUjianSiswa,
  UjianSiswa,
} from "@/services/masuk-ujian.service"

type Jawaban = JawabanSiswa

// Jeda mengetik (ms) sebelum jawaban essai dikirim ke server
const ESSAI_DEBOUNCE = 800

const RICH_CLASS =
  "[&_p]:m-0 [&_p]:min-h-[1em] [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:p-2 [&_th]:p-2 [&_th]:bg-muted/40"

const LOW_TIME_SECONDS = 5 * 60

const stripHtml = (html: string) =>
  html?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() || ""

const isTerjawab = (soal: SoalUjianSiswa, jawaban: Jawaban) => {
  const value = jawaban[soal.id]
  if (soal.tipe === "PG") return Array.isArray(value) && value.length > 0
  return typeof value === "string" && value.trim().length > 0
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`
}

export default function MasukUjianPage() {
  const [token, setToken] = React.useState("")
  const [masuk, setMasuk] = React.useState<MasukUjianResult | null>(null)
  // Selisih jam server dan jam perangkat, dihitung setiap kali menerima data dari server
  const [offset, setOffset] = React.useState(0)

  const terima = React.useCallback((result: MasukUjianResult) => {
    setOffset(result.serverNow - Date.now())
    setMasuk(result)
  }, [])

  if (!masuk) {
    return (
      <TokenForm
        onEntered={(result, value) => {
          setToken(value)
          terima(result)
        }}
      />
    )
  }

  return (
    <UjianRunner
      key={masuk.ujian.id}
      masuk={masuk}
      token={token}
      offset={offset}
      onUpdate={terima}
      onExit={() => setMasuk(null)}
    />
  )
}

// --- LANGKAH 1: INPUT TOKEN ---
function TokenForm({
  onEntered,
}: {
  onEntered: (result: MasukUjianResult, token: string) => void
}) {
  const [token, setToken] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const enterMutation = useMutation({
    mutationFn: (value: string) =>
      fetchJson<MasukUjianResult>("/api/masuk-ujian", {
        method: "POST",
        body: { token: value },
      }),
    onSuccess: (result, value) => onEntered(result, value),
    onError: (err) => setError(getErrorMessage(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = token.trim().toUpperCase()
    if (!value) {
      setError("Token wajib diisi.")
      return
    }
    setError(null)
    enterMutation.mutate(value)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md border shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Masuk Ujian</CardTitle>
          <p className="text-sm text-muted-foreground">
            Masukkan token yang diberikan pengawas untuk memulai ujian.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-center text-xs font-medium text-destructive">
                {error}
              </div>
            )}
            <Input
              value={token}
              onChange={(e) => {
                setToken(e.target.value.toUpperCase())
                setError(null)
              }}
              placeholder="Contoh: A7K2M9"
              maxLength={12}
              autoFocus
              autoComplete="off"
              disabled={enterMutation.isPending}
              className="h-12 text-center font-mono text-lg tracking-[0.3em]"
            />
            <Button type="submit" className="w-full" disabled={enterMutation.isPending}>
              {enterMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memeriksa token...</>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// --- LANGKAH 2 dan 3: KONFIRMASI, LALU PENGERJAAN ---
// Semua keadaan (mulai, jawaban, selesai) disimpan server, jadi refresh atau pindah perangkat
// melanjutkan ujian yang sama dengan sisa waktu yang sama.
function UjianRunner({
  masuk,
  token,
  offset,
  onUpdate,
  onExit,
}: {
  masuk: MasukUjianResult
  token: string
  offset: number
  onUpdate: (result: MasukUjianResult) => void
  onExit: () => void
}) {
  const { ujian, percobaan } = masuk

  const mulaiMutation = useMutation({
    mutationFn: () =>
      fetchJson<MasukUjianResult>("/api/masuk-ujian/mulai", {
        method: "POST",
        body: { token },
      }),
    onSuccess: onUpdate,
    onError: (err) => toast.error(`Gagal memulai ujian: ${getErrorMessage(err)}`),
  })

  if (!percobaan) {
    return (
      <Konfirmasi
        ujian={ujian}
        memulai={mulaiMutation.isPending}
        onBatal={onExit}
        onMulai={() => mulaiMutation.mutate()}
      />
    )
  }

  if (percobaan.status === "Selesai") {
    return <Selesai ujian={ujian} percobaan={percobaan} onExit={onExit} />
  }

  return (
    <Pengerjaan
      ujian={ujian}
      percobaan={percobaan}
      offset={offset}
      onSelesai={(next) => onUpdate({ ...masuk, percobaan: next })}
    />
  )
}

function Konfirmasi({
  ujian,
  memulai,
  onMulai,
  onBatal,
}: {
  ujian: UjianSiswa
  memulai: boolean
  onMulai: () => void
  onBatal: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg border shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{ujian.nama}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Mata Pelajaran: <span className="font-semibold text-foreground">{ujian.mataPelajaran}</span>
              </p>
            </div>
            <Badge variant="outline">{ujian.jenis}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="block text-xs text-muted-foreground">Durasi</span>
              <span className="font-semibold">{ujian.durasiMenit} Menit</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Jumlah Soal</span>
              <span className="font-semibold">{ujian.soal.length} Soal</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Tahun Ajaran</span>
              <span className="font-semibold">{ujian.tahunAjaran} ({ujian.semester})</span>
            </div>
          </div>

          <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Waktu mulai berjalan begitu Anda menekan tombol Mulai dan tidak bisa dihentikan.
              Jangan menutup halaman selama ujian berlangsung.
            </p>
          </div>

          {ujian.soal.length === 0 && (
            <p className="text-sm text-destructive">Ujian ini belum memiliki butir soal.</p>
          )}
        </CardContent>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="outline" onClick={onBatal} disabled={memulai}>Batal</Button>
          <Button onClick={onMulai} disabled={ujian.soal.length === 0 || memulai}>
            {memulai ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memulai...</> : "Mulai Ujian"}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Pengerjaan({
  ujian,
  percobaan,
  offset,
  onSelesai,
}: {
  ujian: UjianSiswa
  percobaan: PercobaanSiswa
  offset: number
  onSelesai: (next: PercobaanSiswa) => void
}) {
  const soalById = React.useMemo(
    () => new Map(ujian.soal.map((s) => [s.id, s])),
    [ujian.soal]
  )
  const soalList = React.useMemo(
    () =>
      percobaan.order
        .map((id) => soalById.get(id))
        .filter((s): s is SoalUjianSiswa => Boolean(s)),
    [percobaan.order, soalById]
  )

  const [jawaban, setJawabanState] = React.useState<Jawaban>(percobaan.jawaban)
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [openKumpul, setOpenKumpul] = React.useState(false)
  const [simpan, setSimpan] = React.useState<"idle" | "saving" | "saved" | "error">("idle")

  const hitungSisa = React.useCallback(
    () => Math.max(0, Math.ceil((percobaan.deadlineAt - (Date.now() + offset)) / 1000)),
    [percobaan.deadlineAt, offset]
  )
  const [timeLeft, setTimeLeft] = React.useState(hitungSisa)

  // Jawaban terbaru dipegang di ref supaya pengumpulan otomatis saat waktu habis
  // tidak memakai data lama
  const jawabanRef = React.useRef(jawaban)
  React.useEffect(() => {
    jawabanRef.current = jawaban
  }, [jawaban])

  const pendingEssai = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pendingCount = React.useRef(0)
  const autoKumpul = React.useRef(false)

  // fetchJson langsung (bukan useMutation): beberapa penyimpanan bisa berjalan bersamaan
  // dan masing-masing harus dihitung selesai
  const kirimJawaban = (soalId: string, value: string[] | string) => {
    pendingCount.current += 1
    setSimpan("saving")
    fetchJson(`/api/masuk-ujian/${percobaan.id}/jawaban`, {
      method: "PUT",
      body: { soalId, jawaban: value },
    })
      .then(() => {
        pendingCount.current -= 1
        if (pendingCount.current === 0) setSimpan((s) => (s === "error" ? s : "saved"))
      })
      // Yang gagal tersimpan tetap ikut terkirim lengkap saat dikumpulkan
      .catch(() => {
        pendingCount.current -= 1
        setSimpan("error")
      })
  }

  const setJawaban = (soal: SoalUjianSiswa, value: string[] | string) => {
    setJawabanState((prev) => ({ ...prev, [soal.id]: value }))

    if (soal.tipe === "PG") {
      kirimJawaban(soal.id, value)
      return
    }
    // Essai: tunggu siswa berhenti mengetik sebentar
    const timers = pendingEssai.current
    const existing = timers.get(soal.id)
    if (existing) clearTimeout(existing)
    timers.set(
      soal.id,
      setTimeout(() => {
        timers.delete(soal.id)
        kirimJawaban(soal.id, value)
      }, ESSAI_DEBOUNCE)
    )
  }

  const kumpulMutation = useMutation({
    mutationFn: () =>
      fetchJson<PercobaanSiswa>(`/api/masuk-ujian/${percobaan.id}/kumpul`, {
        method: "POST",
        // Seluruh jawaban dikirim lagi, supaya yang sempat gagal tersimpan tidak hilang
        body: { jawaban: jawabanRef.current },
      }),
    retry: 3,
    onSuccess: (next) => {
      for (const t of pendingEssai.current.values()) clearTimeout(t)
      pendingEssai.current.clear()
      onSelesai(next)
    },
    onError: (err) => toast.error(`Gagal mengumpulkan jawaban: ${getErrorMessage(err)}`),
  })
  const { mutate: kumpul, isPending: mengumpulkan, isError: kumpulGagal } = kumpulMutation

  // Timer dihitung dari batas waktu server, bukan dikurangi satu per detik, jadi tidak melenceng
  // walaupun tab sempat tidak aktif. Waktu habis = kumpul otomatis (diulang kalau gagal).
  React.useEffect(() => {
    const interval = setInterval(() => {
      const sisa = hitungSisa()
      setTimeLeft(sisa)
      // Otomatis hanya sekali. Kalau gagal, siswa memakai tombol "Kumpulkan Ulang".
      if (sisa <= 0 && !autoKumpul.current) {
        autoKumpul.current = true
        setOpenKumpul(false)
        kumpul()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [hitungSisa, kumpul])

  // Peringatan kalau siswa menutup atau me-refresh halaman saat ujian berjalan
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [])

  const totalSoal = soalList.length
  const totalTerjawab = soalList.filter((s) => isTerjawab(s, jawaban)).length
  const currentSoal = soalList[currentIndex]
  const lowTime = timeLeft <= LOW_TIME_SECONDS

  const togglePilihan = (soal: SoalUjianSiswa, opsiId: string) => {
    const current = Array.isArray(jawaban[soal.id])
      ? (jawaban[soal.id] as string[])
      : []
    if (soal.multiJawaban) {
      setJawaban(
        soal,
        current.includes(opsiId) ? current.filter((id) => id !== opsiId) : [...current, opsiId]
      )
    } else {
      // Satu jawaban: memilih lagi opsi yang sama membatalkan pilihan
      setJawaban(soal, current[0] === opsiId ? [] : [opsiId])
    }
  }

  return (
    <div className="w-full space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-card px-6 py-4">
            <div className="flex flex-col justify-between gap-2 border-b pb-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-xl font-bold">{ujian.nama}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mata Pelajaran: <span className="font-semibold text-foreground">{ujian.mataPelajaran}</span>
                </p>
              </div>
              <Badge variant="outline" className="w-fit px-3 py-1 text-sm">{ujian.jenis}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 text-sm sm:grid-cols-3">
              <div>
                <span className="block text-xs text-muted-foreground">Tahun Ajaran</span>
                <span className="font-semibold">{ujian.tahunAjaran} ({ujian.semester})</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Durasi Waktu</span>
                <span className="font-semibold">{ujian.durasiMenit} Menit</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Total Soal</span>
                <span className="font-semibold">{totalSoal} Soal</span>
              </div>
            </div>
          </div>

          {currentSoal && (
            <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-primary">Soal Nomor {currentIndex + 1}</span>
                  {isTerjawab(currentSoal, jawaban) ? (
                    <Badge className="gap-1 border-emerald-200 bg-emerald-600/10 text-[11px] text-emerald-600 dark:border-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Terjawab
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-amber-300 text-[11px] text-amber-600 dark:border-amber-800">
                      <CircleDashed className="h-3 w-3" /> Belum Dijawab
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{currentSoal.tipe === "PG" ? "Pilihan Ganda" : "Essai"}</Badge>
                  {currentSoal.tipe === "PG" && (
                    <Badge variant="outline" className="text-[10px]">
                      {currentSoal.multiJawaban ? "Pilih Semua yang Benar" : "Pilih 1 Jawaban"}
                    </Badge>
                  )}
                  <Badge variant="outline">Bobot: {currentSoal.bobot}</Badge>
                </div>
              </div>

              {stripHtml(currentSoal.pertanyaan) || /<img\b/i.test(currentSoal.pertanyaan) ? (
                <div
                  className={`min-h-[60px] text-base font-medium leading-relaxed ${RICH_CLASS}`}
                  dangerouslySetInnerHTML={{ __html: currentSoal.pertanyaan }}
                />
              ) : (
                <p className="min-h-[60px] text-base italic leading-relaxed text-muted-foreground">
                  (Pertanyaan kosong)
                </p>
              )}

              {currentSoal.tipe === "PG" && (
                <div className="grid gap-3 pt-2" role={currentSoal.multiJawaban ? "group" : "radiogroup"}>
                  {currentSoal.opsi.map((opsi, oIdx) => {
                    const pilihan = jawaban[currentSoal.id]
                    const dipilih = Array.isArray(pilihan) && pilihan.includes(opsi.id)
                    return (
                      <button
                        key={opsi.id}
                        type="button"
                        role={currentSoal.multiJawaban ? "checkbox" : "radio"}
                        aria-checked={dipilih}
                        onClick={() => togglePilihan(currentSoal, opsi.id)}
                        className={`flex items-center gap-3 rounded-md border p-3.5 text-left text-sm transition-colors ${
                          dipilih
                            ? "border-primary/40 bg-primary/10 font-medium text-foreground"
                            : "bg-background hover:bg-muted/50"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            dipilih ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{opsi.teks}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {currentSoal.tipe === "ESSAI" && (
                <div className="pt-2">
                  <Textarea
                    placeholder="Tulis jawaban Anda di sini..."
                    className="min-h-[160px]"
                    value={
                      typeof jawaban[currentSoal.id] === "string"
                        ? (jawaban[currentSoal.id] as string)
                        : ""
                    }
                    onChange={(e) => setJawaban(currentSoal, e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Sebelumnya
                </Button>
                <span className="text-xs font-medium text-muted-foreground">
                  Halaman {currentIndex + 1} dari {totalSoal}
                </span>
                {currentIndex === totalSoal - 1 ? (
                  <Button onClick={() => setOpenKumpul(true)}>
                    <Send className="mr-2 h-4 w-4" /> Kumpulkan
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentIndex((p) => Math.min(totalSoal - 1, p + 1))}>
                    Selanjutnya <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-1">
          <Card className={`border shadow-sm ${lowTime ? "border-destructive/50" : ""}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2"><Timer className="h-4 w-4" /> Sisa Waktu Ujian</span>
                <Badge variant="outline" className="font-mono text-xs">{ujian.durasiMenit} Menit</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div
                className={`font-mono text-3xl font-extrabold tracking-wider ${
                  lowTime ? "text-destructive" : "text-primary"
                }`}
                aria-live="off"
              >
                {formatTime(timeLeft)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {lowTime ? "Waktu hampir habis!" : "Ujian dikumpulkan otomatis saat waktu habis."}
              </p>
              <p
                className={`mt-2 text-[11px] ${
                  simpan === "error" ? "text-destructive" : "text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {simpan === "saving" && "Menyimpan jawaban..."}
                {simpan === "saved" && "Jawaban tersimpan"}
                {simpan === "error" && "Gagal menyimpan, jawaban dikirim ulang saat dikumpulkan"}
              </p>
              {timeLeft <= 0 && kumpulGagal && (
                <Button className="mt-3 w-full" size="sm" onClick={() => kumpul()} disabled={mengumpulkan}>
                  Kumpulkan Ulang
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Navigasi Soal</CardTitle>
                <span className="text-xs font-medium text-muted-foreground">
                  {totalTerjawab} / {totalSoal} Terjawab
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
              <div className="flex items-center justify-around border-b pb-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-emerald-600" /> <span>Terjawab</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-border bg-muted" /> <span>Belum</span>
                </div>
              </div>

              <div className="grid max-h-[320px] grid-cols-5 gap-2 overflow-y-auto p-1">
                {soalList.map((soal, sIdx) => {
                  const terjawab = isTerjawab(soal, jawaban)
                  return (
                    <button
                      key={soal.id}
                      type="button"
                      onClick={() => setCurrentIndex(sIdx)}
                      className={`flex h-10 w-full items-center justify-center rounded-md border text-xs font-semibold transition-all ${
                        sIdx === currentIndex ? "border-2 border-primary font-bold shadow-sm" : ""
                      } ${
                        terjawab
                          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                          : "border-border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                      title={`Soal No. ${sIdx + 1} (${terjawab ? "Terjawab" : "Belum dijawab"})`}
                    >
                      {sIdx + 1}
                    </button>
                  )
                })}
              </div>

              <Button className="w-full" onClick={() => setOpenKumpul(true)}>
                <Send className="mr-2 h-4 w-4" /> Kumpulkan Jawaban
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={openKumpul} onOpenChange={(open) => { if (!mengumpulkan) setOpenKumpul(open) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Kumpulkan Jawaban?</DialogTitle>
            <DialogDescription>
              {totalTerjawab < totalSoal
                ? `Masih ada ${totalSoal - totalTerjawab} soal yang belum dijawab. `
                : "Semua soal sudah dijawab. "}
              Setelah dikumpulkan, jawaban tidak bisa diubah lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenKumpul(false)} disabled={mengumpulkan}>
              Kembali Mengerjakan
            </Button>
            <Button onClick={() => kumpul()} disabled={mengumpulkan}>
              {mengumpulkan ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengumpulkan...</>
              ) : (
                "Ya, Kumpulkan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Selesai({
  ujian,
  percobaan,
  onExit,
}: {
  ujian: UjianSiswa
  percobaan: PercobaanSiswa
  onExit: () => void
}) {
  const terjawab = ujian.soal.filter((s) => isTerjawab(s, percobaan.jawaban)).length
  const { hasil } = percobaan

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg border text-center shadow-sm">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Ujian Selesai</CardTitle>
          <p className="text-sm text-muted-foreground">{ujian.nama}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            <span className="font-semibold">{terjawab}</span> dari{" "}
            <span className="font-semibold">{ujian.soal.length}</span> soal terjawab.
          </p>

          {hasil ? <HasilSiswa hasil={hasil} /> : (
            <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              Jawaban Anda sudah dikumpulkan. Hasil ujian ini tidak ditampilkan langsung,
              nilai akan disampaikan oleh guru.
            </p>
          )}

          <Button variant="outline" onClick={onExit}>Kembali</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Nilai akhir, ringkasan skor, dan benar atau salah tiap soal (tanpa kunci jawaban)
function HasilSiswa({ hasil }: { hasil: HasilUjian }) {
  const menunggu = hasil.statusNilai === "Menunggu"

  return (
    <div className="space-y-3 text-left">
      <div className="rounded-md border bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">Nilai Akhir</p>
        {menunggu ? (
          <>
            <p className="text-lg font-bold text-amber-600">Menunggu penilaian guru</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Soal essai belum dinilai. Skor pilihan ganda sementara:{" "}
              <span className="font-semibold text-foreground">{hasil.skorPg}</span> dari{" "}
              {hasil.skorMaks} poin.
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl font-extrabold text-primary">{hasil.nilaiAkhir}</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              {hasil.tuntas !== null && (
                <Badge className={hasil.tuntas ? "bg-emerald-600 hover:bg-emerald-600" : "bg-destructive hover:bg-destructive"}>
                  {hasil.tuntas ? "Tuntas" : "Belum Tuntas"}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">KKM {hasil.kkm}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {hasil.skorPg + hasil.skorEssai} dari {hasil.skorMaks} poin
              {hasil.adaEssai && ` (pilihan ganda ${hasil.skorPg}, essai ${hasil.skorEssai})`}
            </p>
          </>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Hasil per soal</p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {hasil.rincian.map((r, i) => {
            const warna =
              r.isBenar === true
                ? "border-emerald-600 bg-emerald-600 text-white"
                : r.isBenar === false
                ? "border-destructive bg-destructive text-white"
                : r.nilai === null
                ? "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                : r.nilai >= r.bobot
                ? "border-emerald-600 bg-emerald-600 text-white"
                : r.nilai > 0
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-destructive bg-destructive text-white"
            const arti =
              r.isBenar === true
                ? "Benar"
                : r.isBenar === false
                ? "Salah"
                : r.nilai === null
                ? "Menunggu penilaian"
                : `Nilai ${r.nilai} dari ${r.bobot}`
            return (
              <div
                key={r.soalId}
                className={`flex h-9 items-center justify-center rounded-md border text-xs font-semibold ${warna}`}
                title={`Soal ${i + 1}: ${arti}`}
              >
                {i + 1}
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-600" /> Benar / nilai penuh</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-destructive" /> Salah / nilai 0</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-500" /> Nilai sebagian</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-amber-400 bg-amber-100" /> Menunggu guru</span>
        </div>
      </div>
    </div>
  )
}
