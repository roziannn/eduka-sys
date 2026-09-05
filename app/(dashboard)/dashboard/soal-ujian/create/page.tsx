"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// --- TYPES ---
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

const listMapel = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Fisika", "Kimia", "Biologi"]
const listJenisUjian = ["UH", "UTS", "UAS", "US"]
const listKelas = ["X IPA", "X IPS", "XI IPA", "XI IPS", "XII IPA", "XII IPS"]

export default function CreateUjianPage() {
  const router = useRouter()

  // --- STATE UJIAN ---
  const [namaUjian, setNamaUjian] = React.useState("")
  const [mataPelajaran, setMataPelajaran] = React.useState(listMapel[0])
  const [jenisUjian, setJenisUjian] = React.useState("UTS")
  const [targetKelas, setTargetKelas] = React.useState<string[]>(["X IPA"])
  const [tahunAjaran, setTahunAjaran] = React.useState("2025/2026")
  const [semester, setSemester] = React.useState("Genap")
  const [durasiMenit, setDurasiMenit] = React.useState(90)
  const [kkm, setKkm] = React.useState(75)
  const [acakSoal, setAcakSoal] = React.useState(true)
  const [tampilkanHasil, setTampilkanHasil] = React.useState(false)

  // --- STATE ACCORDION TERBUKA ---
  const [openItems, setOpenItems] = React.useState<string[]>(["s-1"])

  // --- STATE SOAL ---
  const [soalList, setSoalList] = React.useState<SoalItem[]>([
    {
      id: "s-1",
      pertanyaan: "",
      tipe: "Pilihan Ganda",
      bobot: 10,
      opsi: [
        { id: "o-1", teks: "", isBenar: true },
        { id: "o-2", teks: "", isBenar: false },
        { id: "o-3", teks: "", isBenar: false },
        { id: "o-4", teks: "", isBenar: false },
      ],
    },
  ])

  // --- KONFIGURASI DRIVER.JS (GUIDED TOUR SELALU TAMPIL) ---
  const startTour = React.useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      showButtons: ["next", "previous", "close"],
      nextBtnText: "Lanjut",
      prevBtnText: "Kembali",
      doneBtnText: "Selesai",
      steps: [
        {
          element: "#tour-card-info",
          popover: {
            title: "Konfigurasi Ujian",
            description: "Isi informasi dasar ujian seperti Nama Ujian, Mapel, Jenis, dan Target Kelas di panel ini.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-distribusi-kelas",
          popover: {
            title: "Distribusi Kelas",
            description: "Pilih satu atau beberapa kelas target yang akan mengikuti ujian ini.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-tombol-tambah-soal",
          popover: {
            title: "Tambah Butir Soal",
            description: "Klik tombol ini untuk menambah butir soal Pilihan Ganda atau Essai baru.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#tour-daftar-soal",
          popover: {
            title: "Editor Soal",
            description: "Tuliskan pertanyaan, atur bobot, isi opsi jawaban, dan tentukan kunci jawaban di sini.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-action-buttons",
          popover: {
            title: "Aksi Ujian",
            description: "Anda bisa melihat Preview tampilan soal, menyimpan sebagai Draft, atau menerbitkan ujian jika sudah siap.",
            side: "bottom",
            align: "end",
          },
        },
      ],
    })

    driverObj.drive()
  }, [])

  // Jalankan Tour Otomatis SETIAP KALI Halaman Dimuat / Di-refresh
  React.useEffect(() => {
    const timer = setTimeout(() => {
      startTour()
    }, 500)
    return () => clearTimeout(timer)
  }, [startTour])

  // Total Bobot Keseluruhan
  const totalBobot = React.useMemo(() => {
    return soalList.reduce((acc, curr) => acc + (Number(curr.bobot) || 0), 0)
  }, [soalList])

  // --- HANDLER MULTIPLE KELAS ---
  const handleToggleKelas = (itemKelas: string) => {
    setTargetKelas((prev) =>
      prev.includes(itemKelas)
        ? prev.filter((k) => k !== itemKelas)
        : [...prev, itemKelas]
    )
  }

  // --- HANDLERS SOAL ---
  const handleAddSoal = (tipe: "Pilihan Ganda" | "Essai") => {
    const newId = `s-${Date.now()}`
    const newSoal: SoalItem = {
      id: newId,
      pertanyaan: "",
      tipe,
      bobot: 10,
      opsi:
        tipe === "Pilihan Ganda"
          ? [
              { id: `o-${Date.now()}-1`, teks: "", isBenar: true },
              { id: `o-${Date.now()}-2`, teks: "", isBenar: false },
              { id: `o-${Date.now()}-3`, teks: "", isBenar: false },
              { id: `o-${Date.now()}-4`, teks: "", isBenar: false },
            ]
          : [],
    }
    setSoalList([...soalList, newSoal])
    setOpenItems((prev) => [...prev, newId])
  }

  const handleRemoveSoal = (index: number) => {
    const targetId = soalList[index].id
    setSoalList(soalList.filter((_, i) => i !== index))
    setOpenItems((prev) => prev.filter((id) => id !== targetId))
  }

  const handleUpdateSoalPertanyaan = (index: number, teks: string) => {
    const updated = [...soalList]
    updated[index].pertanyaan = teks
    setSoalList(updated)
  }

  const handleUpdateBobot = (index: number, bobot: number) => {
    const updated = [...soalList]
    updated[index].bobot = bobot
    setSoalList(updated)
  }

  const handleUpdateOpsiTeks = (soalIdx: number, opsiIdx: number, teks: string) => {
    const updated = [...soalList]
    updated[soalIdx].opsi[opsiIdx].teks = teks
    setSoalList(updated)
  }

  const handleSetOpsiBenar = (soalIdx: number, opsiIdx: number) => {
    const updated = [...soalList]
    updated[soalIdx].opsi = updated[soalIdx].opsi.map((o, i) => ({
      ...o,
      isBenar: i === opsiIdx,
    }))
    setSoalList(updated)
  }

  const handleOpenPreviewPage = () => {
    const previewData = {
      namaUjian,
      mataPelajaran,
      jenisUjian,
      targetKelas,
      tahunAjaran,
      semester,
      durasiMenit,
      kkm,
      soalList,
    }
    sessionStorage.setItem("previewUjianData", JSON.stringify(previewData))
    window.open("/dashboard/soal-ujian/create/preview-soal", "_blank")
  }

  const handleSave = (status: "Draft" | "Siap Ujian") => {
    const payload = {
      namaUjian,
      mataPelajaran,
      jenisUjian,
      targetKelas,
      tahunAjaran,
      semester,
      durasiMenit,
      kkm,
      acakSoal,
      tampilkanHasil,
      status,
      jumlahSoal: soalList.length,
      totalBobot,
      soalList,
    }

    console.log("Saving Ujian Payload:", payload)
    router.push("/dashboard/soal-ujian")
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header & Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Buat Soal Ujian Baru
            </h1>
            <p className="text-sm text-muted-foreground">
              Lengkapi konfigurasi ujian dan tambahkan butir soal awal.
            </p>
          </div>
        </div>

        <div id="tour-action-buttons" className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Bantuan Tour" onClick={startTour}>
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Button variant="outline" onClick={handleOpenPreviewPage}>
            <Eye className="mr-2 h-4 w-4" /> Preview Soal
          </Button>
          <Button variant="outline" onClick={() => handleSave("Draft")}>
            <Save className="mr-2 h-4 w-4" /> Simpan Draft
          </Button>
          <Button onClick={() => handleSave("Siap Ujian")}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Terbitkan Ujian
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Kolom Kiri: Sticky Card */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 self-start space-y-6">
          <Card id="tour-card-info">
            <CardHeader>
              <CardTitle className="text-lg">Informasi Ujian</CardTitle>
              <CardDescription>
                Pengaturan dan informasi ujian. <span className="text-destructive">*</span> 
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="namaUjian">
                  Nama Ujian <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="namaUjian"
                  placeholder="Contoh: UTS Matematika Wajib X"
                  value={namaUjian}
                  onChange={(e) => setNamaUjian(e.target.value)}
                  required
                />
              </div>

              {/* MATA PELAJARAN DAN JENIS UJIAN */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 grid gap-2 min-w-0">
                  <Label className="truncate">
                    Mata Pelajaran <span className="text-destructive">*</span>
                  </Label>
                  <Select value={mataPelajaran} onValueChange={(v) => v && setMataPelajaran(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Mapel" />
                    </SelectTrigger>
                    <SelectContent>
                      {listMapel.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1 grid gap-2">
                  <Label className="whitespace-nowrap">
                    Jenis <span className="text-destructive">*</span>
                  </Label>
                  <Select value={jenisUjian} onValueChange={(v) => v && setJenisUjian(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {listJenisUjian.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* DISTRIBUSI KELAS */}
              <div id="tour-distribusi-kelas" className="grid gap-2">
                <Label>
                  Distribusi Kelas <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-lg border">
                  {listKelas.map((k) => {
                    const isChecked = targetKelas.includes(k)
                    return (
                      <div key={k} className="flex items-center space-x-2">
                        <Checkbox
                          id={`kelas-${k}`}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleKelas(k)}
                        />
                        <Label
                          htmlFor={`kelas-${k}`}
                          className="text-xs font-normal cursor-pointer select-none"
                        >
                          {k}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="tahun">
                    Tahun Ajaran <span className="text-destructive">*</span>
                  </Label>
                  <Input id="tahun" value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="semester">
                    Semester <span className="text-destructive">*</span>
                  </Label>
                  <Input id="semester" value={semester} onChange={(e) => setSemester(e.target.value)} required />
                </div>
              </div>

              {/* DURASI DAN KKM */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="grid gap-2">
                  <Label htmlFor="durasi">
                    Durasi (Menit) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="durasi"
                    type="number"
                    value={durasiMenit}
                    onChange={(e) => setDurasiMenit(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="kkm">
                    Nilai KKM <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="kkm"
                    type="number"
                    value={kkm}
                    onChange={(e) => setKkm(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* SWITCH ATURAN */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Acak Urutan Soal</Label>
                    <p className="text-xs text-muted-foreground">Tampilan nomor soal diacak antar peserta.</p>
                  </div>
                  <Switch checked={acakSoal} onCheckedChange={setAcakSoal} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tampilkan Hasil Langsung</Label>
                    <p className="text-xs text-muted-foreground">Siswa dapat melihat nilai begitu selesai.</p>
                  </div>
                  <Switch checked={tampilkanHasil} onCheckedChange={setTampilkanHasil} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Scrollable Area untuk Soal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 bg-background z-10 py-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5" /> Daftar Butir Soal ({soalList.length})
            </h2>
            <div id="tour-tombol-tambah-soal" className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleAddSoal("Pilihan Ganda")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> PG Baru
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleAddSoal("Essai")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Essai Baru
              </Button>
            </div>
          </div>

          <div id="tour-daftar-soal" className="max-h-[calc(100vh-180px)] overflow-y-auto pr-2 space-y-4 rounded-md">
            <Accordion
              {...({
                type: "multiple",
                value: openItems,
                onValueChange: setOpenItems,
              } as React.ComponentProps<typeof Accordion>)}
              className="space-y-4"
            >
              {soalList.map((soal, sIdx) => (
                <AccordionItem
                  key={soal.id}
                  value={soal.id}
                  className="border rounded-lg bg-card px-4 py-1"
                >
                  <div className="flex items-center justify-between w-full">
                    <AccordionTrigger className="hover:no-underline py-3 flex-1">
                      <div className="flex items-center gap-2 text-left">
                        <Badge variant="outline">Nomor {sIdx + 1}</Badge>
                        <Badge>{soal.tipe}</Badge>
                        <span className="text-sm font-normal text-muted-foreground line-clamp-1 max-w-[150px] sm:max-w-[240px]">
                          {soal.pertanyaan || "Pertanyaan belum diisi..."}
                        </span>
                      </div>
                    </AccordionTrigger>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border">
                        <Label htmlFor={`bobot-${soal.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                          Bobot <span className="text-destructive">*</span>:
                        </Label>
                        <Input
                          id={`bobot-${soal.id}`}
                          type="number"
                          min={0}
                          value={soal.bobot}
                          onChange={(e) => handleUpdateBobot(sIdx, Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 h-7 text-xs px-2 text-center bg-background"
                          required
                        />
                      </div>

                      {soalList.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveSoal(sIdx)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <AccordionContent className="pt-2 pb-4 space-y-4 border-t mt-1">
                    <div className="grid gap-2 pt-1 px-1">
                      <Label>
                        Pertanyaan Soal <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        placeholder="Tuliskan pertanyaan soal di sini..."
                        value={soal.pertanyaan}
                        onChange={(e) => handleUpdateSoalPertanyaan(sIdx, e.target.value)}
                        className="min-h-[90px]"
                        required
                      />
                    </div>

                    {soal.tipe === "Pilihan Ganda" && (
                      <div className="space-y-3 pt-2">
                        <Label className="text-xs text-muted-foreground">
                          Opsi Jawaban <span className="text-destructive">*</span>
                        </Label>
                        <div className="space-y-2">
                          {soal.opsi.map((opsi, oIdx) => {
                            const labelOpsi = String.fromCharCode(65 + oIdx)
                            return (
                              <div key={opsi.id} className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={opsi.isBenar ? "default" : "outline"}
                                  className={`w-9 h-9 p-0 shrink-0 ${
                                    opsi.isBenar ? "bg-emerald-600 hover:bg-emerald-700" : ""
                                  }`}
                                  onClick={() => handleSetOpsiBenar(sIdx, oIdx)}
                                >
                                  {labelOpsi}
                                </Button>
                                <Input
                                  placeholder={`Pilihan ${labelOpsi}...`}
                                  value={opsi.teks}
                                  onChange={(e) => handleUpdateOpsiTeks(sIdx, oIdx, e.target.value)}
                                  required
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  )
}