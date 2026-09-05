"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  KeyRound,
  RotateCcw,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  XCircle,
  Timer,
  HelpCircle,
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

// --- TYPES ---
interface Kuis {
  id: string
  namaKuis: string
  mataPelajaran: string
  kelas: string
  token: string
}

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

// --- DUMMY DATA ---
const initialQuizzes: Kuis[] = [
  { id: "k-1", namaKuis: "Kuis Persamaan Kuadrat", mataPelajaran: "Matematika", kelas: "X IPA, X IPS", token: "KUISMATH" },
  { id: "k-2", namaKuis: "Kuis Hukum Newton", mataPelajaran: "Fisika", kelas: "XI IPA", token: "KUISFIS" },
  { id: "k-3", namaKuis: "Kuis Teks Laporan Hasil Observasi", mataPelajaran: "Bahasa Indonesia", kelas: "X IPS", token: "KUISBINDO" },
  { id: "k-4", namaKuis: "Kuis Tata Nama Senyawa", mataPelajaran: "Kimia", kelas: "X IPA", token: "KUISKIM" },
]

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

export default function HasilKuisPage() {
  const [quizzes] = React.useState<Kuis[]>(initialQuizzes)
  const [selectedQuiz, setSelectedQuiz] = React.useState<Kuis | null>(null)
  const [selectedClass, setSelectedClass] = React.useState<string>("X IPA 1")

  // Filter & Search
  const [search, setSearch] = React.useState("")

  // Modal State
  const [openRetakeModal, setOpenRetakeModal] = React.useState(false)
  const [openDetailModal, setOpenDetailModal] = React.useState(false)
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null)
  const [retakeReason, setRetakeReason] = React.useState<string>("Di Bawah KKM")

  // Sorting State
  const [sortQuiz, setSortQuiz] = React.useState<{ col: keyof Kuis | null; dir: "asc" | "desc" }>({
    col: null,
    dir: "asc",
  })
  const [sortStudent, setSortStudent] = React.useState<{ col: keyof Student | null; dir: "asc" | "desc" }>({
    col: null,
    dir: "asc",
  })

  // Pagination State
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // Handlers Sort
  const handleSortQuiz = (col: keyof Kuis) => {
    setSortQuiz((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  const handleSortStudent = (col: keyof Student) => {
    setSortStudent((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  // Processed Data Kuis
  const processedQuizzes = React.useMemo(() => {
    let result = quizzes.filter(
      (item) =>
        item.namaKuis.toLowerCase().includes(search.toLowerCase()) ||
        item.mataPelajaran.toLowerCase().includes(search.toLowerCase()) ||
        item.kelas.toLowerCase().includes(search.toLowerCase()) ||
        item.token.toLowerCase().includes(search.toLowerCase())
    )

    if (sortQuiz.col) {
      result.sort((a, b) => {
        const valA = a[sortQuiz.col!]
        const valB = b[sortQuiz.col!]
        const res = valA.localeCompare(valB)
        return sortQuiz.dir === "asc" ? res : -res
      })
    }
    return result
  }, [quizzes, search, sortQuiz])

  // Processed Data Siswa
  const currentStudents = React.useMemo(() => {
    return dummyStudentsMap[selectedClass] || []
  }, [selectedClass])

  const processedStudents = React.useMemo(() => {
    let result = currentStudents.filter(
      (item) =>
        item.nama.toLowerCase().includes(search.toLowerCase()) || item.nisn.includes(search)
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

  // Pagination Calculations
  const activeDataLength = selectedQuiz ? processedStudents.length : processedQuizzes.length
  const totalPages = Math.ceil(activeDataLength / pageSize) || 1
  const paginatedQuizzes = processedQuizzes.slice((page - 1) * pageSize, page * pageSize)
  const paginatedStudents = processedStudents.slice((page - 1) * pageSize, page * pageSize)

  // Navigation Handlers
  const handleShowQuiz = (quiz: Kuis) => {
    setSelectedQuiz(quiz)
    setSelectedClass("X IPA 1")
    setSearch("")
    setPage(1)
  }

  const handleBack = () => {
    setSelectedQuiz(null)
    setSearch("")
    setPage(1)
  }

  // Open Modals
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
    console.log("Kuis ulang dikonfirmasi untuk:", selectedStudent?.nama, "Alasan:", retakeReason)
    setOpenRetakeModal(false)
  }

  // Helper Warna Status
  const getStatusBadge = (status: Student["status"]) => {
    switch (status) {
      case "Tuntas":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Tuntas
          </Badge>
        )
      case "Di Bawah KKM":
        return (
          <Badge className="bg-destructive hover:bg-destructive/90 gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Di Bawah KKM
          </Badge>
        )
      case "Belum Dikerjakan":
        return (
          <Badge variant="outline" className="text-muted-foreground border-border gap-1">
            <Clock className="h-3.5 w-3.5" />
            Belum Dikerjakan
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
           Hasil Kuis
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedQuiz
              ? `Hasil & koreksi lembar jawaban kuis: ${selectedQuiz.namaKuis}`
              : "Daftar rekapitulasi nilai kuis latihan siswa/i."}
          </p>
        </div>

        {selectedQuiz && (
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Kuis
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          placeholder={selectedQuiz ? "Cari NISN atau nama siswa..." : "Cari nama kuis, mapel, kelas, atau token..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
      </div>

      {/* Tampilan Utama */}
      {!selectedQuiz ? (
        /* TABEL UTAMA: DAFTAR KUIS */
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">No</TableHead>
                {(["namaKuis", "mataPelajaran", "kelas", "token"] as const).map((col) => (
                  <TableHead key={col}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSortQuiz(col)}
                      className="-ml-3 h-8"
                    >
                      {col === "namaKuis"
                        ? "Nama Kuis"
                        : col === "mataPelajaran"
                        ? "Mata Pelajaran"
                        : col === "kelas"
                        ? "Distribusi Kelas"
                        : "Token Kuis"}
                      {sortQuiz.col === col ? (
                        sortQuiz.dir === "asc" ? (
                          <ArrowUp className="ml-1 h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="ml-1 h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="text-center w-[120px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuizzes.length ? (
                paginatedQuizzes.map((item, i) => (
                  <TableRow key={item.id}>
                    <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                    <TableCell className="font-semibold">{item.namaKuis}</TableCell>
                    <TableCell>{item.mataPelajaran}</TableCell>
                    
                    {/* BADGE DISTRIBUSI KELAS */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {item.kelas.split(",").map((k, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[11px] font-medium bg-muted/60 text-foreground hover:bg-muted border"
                          >
                            {k.trim()}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="font-mono gap-1">
                        <KeyRound className="h-3 w-3" />
                        {item.token}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleShowQuiz(item)}
                      >
                        <Eye className="mr-1.5 h-4 w-4" /> Show
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Data kuis tidak ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
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
      ) : (
        /* DETAIL PAGE: SIDEBAR KELAS + TABEL SISWA */
        <div className="flex flex-col md:flex-row gap-4">
          {/* Sidebar Kelas */}
          <aside className="w-full md:w-64 bg-card rounded-md border p-3 h-fit shrink-0 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase px-2 py-1">
              <Users className="h-4 w-4" /> Pilih Kelas
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
          </aside>

          {/* Area Tabel Siswa */}
          <div className="flex-1 rounded-md border bg-card">
            <div className="p-3 border-b flex justify-between items-center bg-muted/30">
              <span className="text-sm font-semibold">
                Daftar Siswa Kelas <Badge className="ml-1">{selectedClass}</Badge>
              </span>
              <span className="text-xs text-muted-foreground">
                Total: {processedStudents.length} Siswa
              </span>
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
                        className="-ml-3 h-8"
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
                    </TableHead>
                  ))}
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length ? (
                  paginatedStudents.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{item.nisn}</TableCell>
                      <TableCell className="font-semibold">{item.nama}</TableCell>
                      <TableCell className="font-bold">
                        {item.nilai !== null ? item.nilai : "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>
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
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Data siswa tidak ditemukan di kelas ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
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
      )}

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
              {/* Informasi Pengerjaan Kuis */}
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
                  <p className="font-semibold text-foreground">
                    {selectedStudent.durasiPengerjaan || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground block font-medium">Skor Akhir & Status</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground">{selectedStudent.nilai ?? "-"}</span>
                    {getStatusBadge(selectedStudent.status)}
                  </div>
                </div>
              </div>

              {/* Rincian Lembar Jawaban */}
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