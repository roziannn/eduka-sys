"use client"

import * as React from "react"
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck,
  FileSpreadsheet,
  Pencil,
  Plus,
  Printer,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// --- TYPES ---
interface RombelKelas {
  id: string
  namaKelas: string
  tingkat: string
  tahunAjaran: string
  semester: string
  waliKelas: string
  jumlahSiswa: number
  statusRapor: "Belum Di-generate" | "Proses Koreksi" | "Siap Bagikan"
}

interface SiswaRapor {
  id: string
  nisn: string
  nama: string
  nilaiRataRata: number
  peringkat: number
  statusGenerate: boolean
}

// --- DUMMY DATA ---
const listTahunAjaran = ["2025/2026", "2024/2025"]
const listSemester = ["Genap", "Ganjil"]
const listWaliKelas = ["Budi Santoso, S.Pd.", "Siti Rahma, M.Pd.", "Dedi Prasetyo, S.Si.", "Eko Prasetyo, S.T."]

const initialKelasData: RombelKelas[] = [
  { id: "k-1", namaKelas: "X IPA 1", tingkat: "X", tahunAjaran: "2025/2026", semester: "Genap", waliKelas: "Budi Santoso, S.Pd.", jumlahSiswa: 32, statusRapor: "Proses Koreksi" },
  { id: "k-2", namaKelas: "X IPS 1", tingkat: "X", tahunAjaran: "2025/2026", semester: "Genap", waliKelas: "Siti Rahma, M.Pd.", jumlahSiswa: 30, statusRapor: "Siap Bagikan" },
  { id: "k-3", namaKelas: "XI IPA 2", tingkat: "XI", tahunAjaran: "2024/2025", semester: "Ganjil", waliKelas: "Dedi Prasetyo, S.Si.", jumlahSiswa: 34, statusRapor: "Belum Di-generate" },
]

const initialSiswaMap: Record<string, SiswaRapor[]> = {
  "k-1": [
    { id: "s-1", nisn: "0051234001", nama: "Ahmad Rizky", nilaiRataRata: 88.5, peringkat: 1, statusGenerate: true },
    { id: "s-2", nisn: "0051234002", nama: "Amanda Citra", nilaiRataRata: 85.2, peringkat: 2, statusGenerate: true },
    { id: "s-3", nisn: "0051234003", nama: "Bagas Pratama", nilaiRataRata: 79.0, peringkat: 3, statusGenerate: false },
  ],
  "k-2": [
    { id: "s-4", nisn: "0051234004", nama: "Dina Larasati", nilaiRataRata: 90.1, peringkat: 1, statusGenerate: true },
    { id: "s-5", nisn: "0051234005", nama: "Eko Wijaya", nilaiRataRata: 82.4, peringkat: 2, statusGenerate: true },
  ],
}

export default function RaporPenilaianPage() {
  const [kelasData, setKelasData] = React.useState<RombelKelas[]>(initialKelasData)
  const [selectedKelas, setSelectedKelas] = React.useState<RombelKelas | null>(null)
  const [siswaList, setSiswaList] = React.useState<SiswaRapor[]>([])

  // Filter & Search States
  const [tahunAjaran, setTahunAjaran] = React.useState("2025/2026")
  const [semester, setSemester] = React.useState("Genap")
  const [search, setSearch] = React.useState("")

  // Sort State
  const [sortKelas, setSortKelas] = React.useState<{ col: keyof RombelKelas | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })
  const [sortSiswa, setSortSiswa] = React.useState<{ col: keyof SiswaRapor | null; dir: "asc" | "desc" }>({ col: null, dir: "asc" })

  // Pagination State
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  // Dialog Modals
  const [openGenerateModal, setOpenGenerateModal] = React.useState(false)
  const [openAddModal, setOpenAddModal] = React.useState(false)

  // Form State untuk Tambah Data
  const [formKelas, setFormKelas] = React.useState({
    namaKelas: "",
    tingkat: "X",
    waliKelas: listWaliKelas[0],
    tahunAjaran: "2025/2026",
    semester: "Genap",
  })

  const [formSiswa, setFormSiswa] = React.useState({
    nisn: "",
    nama: "",
    nilaiRataRata: "",
  })

  // Toggle Sort
  const handleSortKelas = (col: keyof RombelKelas) => {
    setSortKelas((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  const handleSortSiswa = (col: keyof SiswaRapor) => {
    setSortSiswa((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  // Filter & Sort Data
  const processedKelasData = React.useMemo(() => {
    let result = kelasData.filter(
      (item) =>
        item.tahunAjaran === tahunAjaran &&
        item.semester === semester &&
        (item.namaKelas.toLowerCase().includes(search.toLowerCase()) ||
          item.waliKelas.toLowerCase().includes(search.toLowerCase()))
    )

    if (sortKelas.col) {
      result.sort((a, b) => {
        const valA = a[sortKelas.col!]
        const valB = b[sortKelas.col!]
        const res = typeof valA === "string" ? valA.localeCompare(valB as string) : Number(valA) - Number(valB)
        return sortKelas.dir === "asc" ? res : -res
      })
    }
    return result
  }, [kelasData, tahunAjaran, semester, search, sortKelas])

  const processedSiswaData = React.useMemo(() => {
    let result = siswaList.filter(
      (item) =>
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        item.nisn.includes(search)
    )

    if (sortSiswa.col) {
      result.sort((a, b) => {
        const valA = a[sortSiswa.col!]
        const valB = b[sortSiswa.col!]
        const res = typeof valA === "string" ? valA.localeCompare(valB as string) : Number(valA) - Number(valB)
        return sortSiswa.dir === "asc" ? res : -res
      })
    }
    return result
  }, [siswaList, search, sortSiswa])

  // Pagination Calculations
  const activeDataLength = selectedKelas ? processedSiswaData.length : processedKelasData.length
  const totalPages = Math.ceil(activeDataLength / pageSize) || 1
  const paginatedKelas = processedKelasData.slice((page - 1) * pageSize, page * pageSize)
  const paginatedSiswa = processedSiswaData.slice((page - 1) * pageSize, page * pageSize)

  // Handlers
  const handleSelectKelas = (kelas: RombelKelas) => {
    setSelectedKelas(kelas)
    setSiswaList(initialSiswaMap[kelas.id] || [])
    setSearch("")
    setPage(1)
  }

  const handleBackToKelas = () => {
    setSelectedKelas(null)
    setSearch("")
    setPage(1)
  }

  const handleGenerateAll = () => {
    setSiswaList((prev) => prev.map((s) => ({ ...s, statusGenerate: true })))
    if (selectedKelas) {
      setKelasData((prev) =>
        prev.map((k) => (k.id === selectedKelas.id ? { ...k, statusRapor: "Siap Bagikan" } : k))
      )
      setSelectedKelas((prev) => (prev ? { ...prev, statusRapor: "Siap Bagikan" } : null))
    }
    setOpenGenerateModal(false)
  }

  const handleGenerateSingle = (id: string) => {
    setSiswaList((prev) => prev.map((s) => (s.id === id ? { ...s, statusGenerate: true } : s)))
  }

  // Handle Save (Create New)
  const handleSaveData = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKelas) {
      // Tambah Rapor Kelas Baru
      const newKelas: RombelKelas = {
        id: `k-${Date.now()}`,
        namaKelas: formKelas.namaKelas,
        tingkat: formKelas.tingkat,
        tahunAjaran: formKelas.tahunAjaran,
        semester: formKelas.semester,
        waliKelas: formKelas.waliKelas,
        jumlahSiswa: 0,
        statusRapor: "Belum Di-generate",
      }
      setKelasData((prev) => [newKelas, ...prev])
      setFormKelas({ namaKelas: "", tingkat: "X", waliKelas: listWaliKelas[0], tahunAjaran: "2025/2026", semester: "Genap" })
    } else {
      // Tambah Siswa ke Kelas terpilih
      const newSiswa: SiswaRapor = {
        id: `s-${Date.now()}`,
        nisn: formSiswa.nisn,
        nama: formSiswa.nama,
        nilaiRataRata: Number(formSiswa.nilaiRataRata) || 0,
        peringkat: siswaList.length + 1,
        statusGenerate: false,
      }
      setSiswaList((prev) => [...prev, newSiswa])
      setKelasData((prev) =>
        prev.map((k) => (k.id === selectedKelas.id ? { ...k, jumlahSiswa: k.jumlahSiswa + 1 } : k))
      )
      setFormSiswa({ nisn: "", nama: "", nilaiRataRata: "" })
    }
    setOpenAddModal(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
             Rapor & Penilaian
          </h1>
          <p className="text-sm text-muted-foreground">
            {selectedKelas
              ? `Manajemen nilai dan cetak rapor untuk kelas ${selectedKelas.namaKelas}`
              : "Plotting dan pencetakan rapor siswa per kelas dan tahun ajaran."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedKelas && (
            <Button variant="outline" onClick={handleBackToKelas}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          )}

          <Button onClick={() => setOpenAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> {selectedKelas ? "Tambah Siswa" : "Tambah Rapor Kelas"}
          </Button>

          {selectedKelas && (
            <Button variant="secondary" onClick={() => setOpenGenerateModal(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Generate Semua
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          placeholder={selectedKelas ? "Cari NISN atau nama siswa..." : "Cari kelas atau wali kelas..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />

        {!selectedKelas && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={tahunAjaran}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tahun Ajaran" />
              </SelectTrigger>
              <SelectContent>
                {listTahunAjaran.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={semester}>
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
          {!selectedKelas ? (
            /* VIEW 1: TABLE KELAS */
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {(["namaKelas", "waliKelas", "jumlahSiswa", "statusRapor"] as const).map((col) => (
                    <TableHead key={col}>
                      <Button variant="ghost" size="sm" onClick={() => handleSortKelas(col)} className="-ml-3 h-8">
                        {col === "namaKelas"
                          ? "Nama Kelas"
                          : col === "waliKelas"
                          ? "Wali Kelas"
                          : col === "jumlahSiswa"
                          ? "Jumlah Siswa"
                          : "Status Rapor"}
                        {sortKelas.col === col ? (
                          sortKelas.dir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
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
                {paginatedKelas.length ? (
                  paginatedKelas.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-semibold">{item.namaKelas}</TableCell>
                      <TableCell>{item.waliKelas}</TableCell>
                      <TableCell>{item.jumlahSiswa} Siswa</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.statusRapor === "Siap Bagikan" ? "default" : "outline"}
                          className={
                            item.statusRapor === "Siap Bagikan"
                              ? "bg-emerald-600"
                              : item.statusRapor === "Proses Koreksi"
                              ? "text-amber-600 border-amber-300"
                              : ""
                          }
                        >
                          {item.statusRapor}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleSelectKelas(item)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Detail & Rapor
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Data kelas tidak ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </>
          ) : (
            /* VIEW 2: TABLE SISWA */
            <>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  {(["nisn", "nama", "nilaiRataRata", "peringkat", "statusGenerate"] as const).map((col) => (
                    <TableHead key={col}>
                      <Button variant="ghost" size="sm" onClick={() => handleSortSiswa(col)} className="-ml-3 h-8">
                        {col === "nisn"
                          ? "NISN"
                          : col === "nama"
                          ? "Nama Siswa"
                          : col === "nilaiRataRata"
                          ? "Nilai Rata-Rata"
                          : col === "peringkat"
                          ? "Peringkat"
                          : "Status Rapor"}
                        {sortSiswa.col === col ? (
                          sortSiswa.dir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
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
                {paginatedSiswa.length ? (
                  paginatedSiswa.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono">{item.nisn}</TableCell>
                      <TableCell className="font-semibold">{item.nama}</TableCell>
                      <TableCell>{item.nilaiRataRata}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          Rank #{item.peringkat}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.statusGenerate ? "default" : "outline"}
                          className={item.statusGenerate ? "bg-emerald-600" : "text-amber-600 border-amber-300"}
                        >
                          {item.statusGenerate ? "Tersedia" : "Belum Di-generate"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!item.statusGenerate ? (
                          <Button size="sm" variant="outline" onClick={() => handleGenerateSingle(item.id)}>
                            <FileCheck className="mr-1 h-3.5 w-3.5" /> Generate
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <Printer className="mr-1 h-3.5 w-3.5" /> Cetak
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Data siswa tidak ditemukan.
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
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
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

      {/* MODAL 1: FORM TAMBAH (KELAS / SISWA) */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSaveData} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{selectedKelas ? "Tambah Siswa Baru" : "Tambah Rapor Kelas"}</DialogTitle>
              <DialogDescription>
                {selectedKelas
                  ? `Tambahkan data siswa ke kelas ${selectedKelas.namaKelas}.`
                  : "Buat slot lembar rapor untuk kelas dan tahun ajaran baru."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {!selectedKelas ? (
                /* Form Input Kelas */
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="namaKelas">Nama Kelas</Label>
                    <Input
                      id="namaKelas"
                      placeholder="Contoh: XII IPA 1"
                      value={formKelas.namaKelas}
                      onChange={(e) => setFormKelas({ ...formKelas, namaKelas: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="waliKelas">Wali Kelas</Label>
                    <Select
                      value={formKelas.waliKelas}
                    >
                      <SelectTrigger id="waliKelas">
                        <SelectValue placeholder="Pilih Wali Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        {listWaliKelas.map((guru) => (
                          <SelectItem key={guru} value={guru}>{guru}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="tahunAjaran">Tahun Ajaran</Label>
                      <Input
                        id="tahunAjaran"
                        value={formKelas.tahunAjaran}
                        onChange={(e) => setFormKelas({ ...formKelas, tahunAjaran: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="semester">Semester</Label>
                      <Select
                        value={formKelas.semester}
                      >
                        <SelectTrigger id="semester">
                          <SelectValue placeholder="Semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {listSemester.map((sem) => (
                            <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                /* Form Input Siswa */
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="nisn">NISN</Label>
                    <Input
                      id="nisn"
                      placeholder="Contoh: 0051234009"
                      value={formSiswa.nisn}
                      onChange={(e) => setFormSiswa({ ...formSiswa, nisn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="namaSiswa">Nama Lengkap Siswa</Label>
                    <Input
                      id="namaSiswa"
                      placeholder="Masukkan nama siswa"
                      value={formSiswa.nama}
                      onChange={(e) => setFormSiswa({ ...formSiswa, nama: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nilai">Nilai Rata-Rata Awal (Opsional)</Label>
                    <Input
                      id="nilai"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={formSiswa.nilaiRataRata}
                      onChange={(e) => setFormSiswa({ ...formSiswa, nilaiRataRata: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAddModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: GENERATE ALL */}
      <Dialog open={openGenerateModal} onOpenChange={setOpenGenerateModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Generate Rapor Kelas</DialogTitle>
            <DialogDescription>
              Kalkulasi otomatis akumulasi nilai untuk kelas {selectedKelas?.namaKelas}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Tahun Ajaran & Semester</Label>
              <Input value={`${selectedKelas?.tahunAjaran || ""} (${selectedKelas?.semester || ""})`} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Wali Kelas</Label>
              <Input value={selectedKelas?.waliKelas || ""} disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Proses ini akan memperbarui peringkat seluruh siswa serta menerbitkan file PDF rapor siap cetak.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenGenerateModal(false)}>
              Batal
            </Button>
            <Button type="button" onClick={handleGenerateAll}>
              Proses Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}