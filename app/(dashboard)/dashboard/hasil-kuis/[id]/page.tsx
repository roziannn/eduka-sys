"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface JawabanDetail {
  no: number
  pertanyaan: string
  jawabanSiswa: string
  kunciJawaban: string
  isBenar: boolean
  poin: number
}

interface Student {
  id: string
  nisn: string
  nama: string
  nilai: number | null
  status: "Tuntas" | "Di Bawah KKM" | "Belum Dikerjakan"
  waktuMulai?: string
  waktuSelesai?: string
  durasiPengerjaan?: string
  tanggal?: string
  jawabanDetail?: JawabanDetail[]
}

const dummyClasses = ["X IPA 1", "X IPA 2", "X IPS 1", "XI IPA 1"]

const dummyJawabanList: JawabanDetail[] = [
  {
    no: 1,
    pertanyaan: "Akar-akar dari persamaan x² - 5x + 6 = 0 adalah...",
    jawabanSiswa: "A. x = 2 dan x = 3",
    kunciJawaban: "A. x = 2 dan x = 3",
    isBenar: true,
    poin: 50,
  },
  {
    no: 2,
    pertanyaan: "Berapakah nilai diskriminan dari persamaan 2x² + 4x + 2 = 0?",
    jawabanSiswa: "0",
    kunciJawaban: "0",
    isBenar: true,
    poin: 50,
  },
]

const dummyStudentsMap: Record<string, Student[]> = {
  "X IPA 1": [
    {
      id: "p-1",
      nisn: "0051234001",
      nama: "Ahmad Rizky",
      nilai: 100,
      status: "Tuntas",
      tanggal: "Selasa, 15 September 2026",
      waktuMulai: "09:00 WIB",
      waktuSelesai: "09:12 WIB",
      durasiPengerjaan: "12 Menit",
      jawabanDetail: dummyJawabanList,
    },
    {
      id: "p-2",
      nisn: "0051234002",
      nama: "Amanda Citra",
      nilai: 50,
      status: "Di Bawah KKM",
      tanggal: "Selasa, 15 September 2026",
      waktuMulai: "09:05 WIB",
      waktuSelesai: "09:18 WIB",
      durasiPengerjaan: "13 Menit",
      jawabanDetail: [
        {
          no: 1,
          pertanyaan: "Akar-akar dari persamaan x² - 5x + 6 = 0 adalah...",
          jawabanSiswa: "B. x = -2 dan x = -3",
          kunciJawaban: "A. x = 2 dan x = 3",
          isBenar: false,
          poin: 0,
        },
        {
          no: 2,
          pertanyaan: "Berapakah nilai diskriminan dari persamaan 2x² + 4x + 2 = 0?",
          jawabanSiswa: "0",
          kunciJawaban: "0",
          isBenar: true,
          poin: 50,
        },
      ],
    },
    { id: "p-3", nisn: "0051234003", nama: "Bagas Pratama", nilai: null, status: "Belum Dikerjakan" },
  ],
  "X IPA 2": [
    {
      id: "p-4",
      nisn: "0051234004",
      nama: "Dina Larasati",
      nilai: 50,
      status: "Di Bawah KKM",
      tanggal: "Selasa, 15 September 2026",
      waktuMulai: "10:00 WIB",
      waktuSelesai: "10:14 WIB",
      durasiPengerjaan: "14 Menit",
      jawabanDetail: dummyJawabanList,
    },
  ],
}

export default function DetailHasilKuisPage() {
  const params = useParams()
  const quizId = params?.id as string

  const [selectedClass, setSelectedClass] = React.useState<string>("X IPA 1")
  const [search, setSearch] = React.useState("")

  const [openRetakeModal, setOpenRetakeModal] = React.useState(false)
  const [openDetailModal, setOpenDetailModal] = React.useState(false)
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null)
  const [retakeReason, setRetakeReason] = React.useState<string>("Di Bawah KKM")

  const [sortStudent, setSortStudent] = React.useState<{ col: keyof Student | null; dir: "asc" | "desc" }>({
    col: null,
    dir: "asc",
  })

  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const handleSortStudent = (col: keyof Student) => {
    setSortStudent((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  const currentStudents = React.useMemo(() => {
    return dummyStudentsMap[selectedClass] || []
  }, [selectedClass])

  const processedStudents = React.useMemo(() => {
    let result = currentStudents.filter(
      (item) => item.nama.toLowerCase().includes(search.toLowerCase()) || item.nisn.includes(search)
    )

    if (sortStudent.col) {
      result.sort((a, b) => {
        const valA = a[sortStudent.col!]
        const valB = b[sortStudent.col!]
        if (valA === null) return 1
        if (valB === null) return -1
        const res = typeof valA === "string" ? valA.localeCompare(valB as string) : Number(valA) - Number(valB)
        return sortStudent.dir === "asc" ? res : -res
      })
    }
    return result
  }, [currentStudents, search, sortStudent])

  const totalPages = Math.ceil(processedStudents.length / pageSize) || 1
  const paginatedStudents = processedStudents.slice((page - 1) * pageSize, page * pageSize)

  const handleOpenRetake = (student: Student) => {
    setSelectedStudent(student)
    setRetakeReason("Di Bawah KKM")
    setOpenRetakeModal(true)
  }

  const handleOpenDetail = (student: Student) => {
    setSelectedStudent(student)
    setOpenDetailModal(true)
  }

  const handleConfirmRetake = () => {
    console.log("Kuis ulang dikonfirmasi untuk:", selectedStudent?.nama, "Alasan:", retakeReason, "ID Kuis:", quizId)
    setOpenRetakeModal(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const getStatusBadge = (status: Student["status"]) => {
    switch (status) {
      case "Tuntas":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1 print:border print:border-emerald-600 print:bg-transparent print:text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 print:hidden" />
            Tuntas
          </Badge>
        )
      case "Di Bawah KKM":
        return (
          <Badge className="bg-destructive hover:bg-destructive/90 gap-1 print:border print:border-red-600 print:bg-transparent print:text-red-700">
            <AlertCircle className="h-3.5 w-3.5 print:hidden" />
            Di Bawah KKM
          </Badge>
        )
      case "Belum Dikerjakan":
        return (
          <Badge variant="outline" className="text-muted-foreground border-border gap-1">
            <Clock className="h-3.5 w-3.5 print:hidden" />
            Belum Dikerjakan
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4 print:p-0 print:m-0">
      {/* Style khusus cetak PDF */}
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
          th, td {
            padding: 6px 8px !important;
            border: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 print:text-xl">Hasil Kuis</h1>
          <p className="text-sm text-muted-foreground print:text-xs">
            Hasil & koreksi lembar jawaban kuis ID: <span className="font-semibold text-foreground">{quizId}</span>
          </p>
        </div>

        <Link href="/dashboard/hasil-kuis" className="no-print">
          <Button variant="outline">
            <ChevronLeft className="h-4 w-4" /> Kembali ke Daftar Kuis
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar & Cetak */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between no-print">
        <Input
          placeholder="Cari NISN atau nama siswa..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />

        <Button variant="outline" onClick={handlePrint} className="gap-2 shrink-0">
          <Printer className="h-4 w-4" /> Cetak Hasil
        </Button>
      </div>

      {/* Detail Page Layout (Flex Items Stretch agar Footer Konsisten) */}
      <div className="flex flex-col md:flex-row gap-4 print:block items-stretch">
        {/* Sidebar Kelas */}
        <aside className="w-full md:w-64 bg-card rounded-md border p-3 shrink-0 space-y-2 no-print flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
              Pilih Kelas
            </div>
            <div className="space-y-1">
              {dummyClasses.map((cls) => {
                const isActive = selectedClass === cls
                return (
                  <button
                    key={cls}
                    onClick={() => {
                      setSelectedClass(cls)
                      setPage(1)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-accent hover:text-accent-foreground text-foreground"
                    }`}
                  >
                    <span>{cls}</span>
                    {isActive && <ChevronRight className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Area Tabel Siswa (Menggunakan Flex Col & Min Height untuk Mengunci Footer) */}
        <div className="flex-1 rounded-md border bg-card print-full-width flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="p-3 border-b flex justify-between items-center bg-muted/30 print:bg-transparent print:p-2">
              <span className="text-sm font-semibold print:text-xs">
                Daftar Siswa Kelas <Badge className="ml-1 print:border print:bg-transparent print:text-black">{selectedClass}</Badge>
              </span>
              <span className="text-xs text-muted-foreground">Total: {processedStudents.length} Siswa</span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {(["nisn", "nama", "nilai", "status"] as const).map((col) => (
                    <TableHead key={col}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSortStudent(col)}
                        className="-ml-3 h-8 no-print"
                      >
                        {col === "nisn"
                          ? "NISN"
                          : col === "nama"
                          ? "Nama Siswa"
                          : col === "nilai"
                          ? "Skor Kuis"
                          : "Status Hasil"}
                        {sortStudent.col === col ? (
                          sortStudent.dir === "asc" ? (
                            <ArrowUp className="ml-1 h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="ml-1 h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                        )}
                      </Button>
                      <span className="hidden print:inline font-semibold">
                        {col === "nisn"
                          ? "NISN"
                          : col === "nama"
                          ? "Nama Siswa"
                          : col === "nilai"
                          ? "Skor Kuis"
                          : "Status Hasil"}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="no-print">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length ? (
                  paginatedStudents.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{item.nisn}</TableCell>
                      <TableCell className="font-semibold">{item.nama}</TableCell>
                      <TableCell className="font-bold">{item.nilai !== null ? item.nilai : "-"}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="no-print">
                        <div className="flex gap-1.5">
                          {item.status !== "Belum Dikerjakan" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetail(item)}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" /> Lihat Hasil
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenRetake(item)}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Kuis Ulang
                          </Button>
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

          {/* Pagination Terkunci di Bawah */}
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground no-print mt-auto">
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

      {/* MODAL KUIS ULANG */}
      <Dialog open={openRetakeModal} onOpenChange={setOpenRetakeModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" /> Atur Kuis Ulang
            </DialogTitle>
            <DialogDescription>
              Izinkan siswa <strong>{selectedStudent?.nama}</strong> untuk mengerjakan kuis kembali.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Label className="text-sm font-semibold">Pilih Alasan Kuis Ulang:</Label>
            <RadioGroup value={retakeReason} onValueChange={setRetakeReason} className="space-y-2">
              <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="Di Bawah KKM" id="r1" className="mt-1" />
                <div className="space-y-0.5">
                  <Label htmlFor="r1" className="font-semibold cursor-pointer">
                    Di Bawah KKM Kuis
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Skor kuis siswa belum mencapai batas tuntas.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="teknis" id="r2" className="mt-1" />
                <div className="space-y-0.5">
                  <Label htmlFor="r2" className="font-semibold cursor-pointer">
                    Kendala Teknis / Jaringan
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Terjadi gangguan koneksi internet saat pengerjaan.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="kurang_maksimal" id="r3" className="mt-1" />
                <div className="space-y-0.5">
                  <Label htmlFor="r3" className="font-semibold cursor-pointer">
                    Latihan Tambahan
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Diberikan kesempatan tambahan untuk memperdalam pemahaman materi.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRetakeModal(false)}>
              Batal
            </Button>
            <Button onClick={handleConfirmRetake}>Konfirmasi & Izinkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL LIHAT HASIL PENGERJAAN */}
      <Dialog open={openDetailModal} onOpenChange={setOpenDetailModal}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Rincian Pengerjaan Kuis
            </DialogTitle>
            <DialogDescription>
              Detail aktivitas dan jawaban siswa <strong>{selectedStudent?.nama}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-muted/40 p-3.5 rounded-lg text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Tanggal
                  </span>
                  <p className="font-semibold text-foreground">{selectedStudent.tanggal || "-"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Waktu Pengerjaan
                  </span>
                  <p className="font-semibold text-foreground">
                    {selectedStudent.waktuMulai} - {selectedStudent.waktuSelesai}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Timer className="h-3.5 w-3.5 text-primary" /> Durasi
                  </span>
                  <p className="font-semibold text-foreground">{selectedStudent.durasiPengerjaan || "-"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground block font-medium">Skor Akhir & Status</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground">{selectedStudent.nilai ?? "-"}</span>
                    {getStatusBadge(selectedStudent.status)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold border-b pb-2 flex items-center justify-between">
                  <span>Daftar Jawaban Siswa</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Total: {selectedStudent.jawabanDetail?.length || 0} Pertanyaan
                  </span>
                </h3>

                {selectedStudent.jawabanDetail?.length ? (
                  <div className="space-y-3">
                    {selectedStudent.jawabanDetail.map((j) => (
                      <div key={j.no} className="border rounded-md p-3.5 space-y-2 text-xs bg-card">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">Soal No. {j.no}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Poin: {j.poin}</Badge>
                            {j.isBenar ? (
                              <Badge className="bg-emerald-600 gap-1 text-[10px]">
                                <CheckCircle2 className="h-3 w-3" /> Benar
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1 text-[10px]">
                                <XCircle className="h-3 w-3" /> Salah
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="font-medium text-foreground leading-relaxed">{j.pertanyaan}</p>

                        <div className="grid grid-cols-1 gap-1.5 pt-1 bg-muted/40 p-2.5 rounded">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Jawaban Siswa:</span>
                            <span className="font-semibold text-foreground">{j.jawabanSiswa}</span>
                          </div>
                          {!j.isBenar && (
                            <div>
                              <span className="text-emerald-600 font-medium block text-[11px]">
                                Kunci Jawaban Benar:
                              </span>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {j.kunciJawaban}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Belum ada riwayat pengerjaan.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setOpenDetailModal(false)}>Tutup Detail</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}