"use client"

import * as React from "react"
import { 
  Users, 
  UserPlus, 
  Plus, 
  Pencil, 
  DoorOpen,
  UserMinus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"

interface Rombel {
  id: string
  namaRombel: string
  tingkat: string
  waliKelas: string
  ruangan: string
  kapasitas: number
  jumlahSiswa: number
  tahunAjaran: string
  isAktif: boolean
}

interface Student {
  id: string
  nisn: string
  nama: string
  jenisKelamin: "L" | "P"
  rombelId: string | null
}

const initialRombel: Rombel[] = [
  { id: "r1", namaRombel: "X IPA 1", tingkat: "X", waliKelas: "Budi Santoso, S.Pd.", ruangan: "Lab Fisika A", kapasitas: 36, jumlahSiswa: 3, tahunAjaran: "2025/2026", isAktif: true },
  { id: "r2", namaRombel: "X IPS 1", tingkat: "X", waliKelas: "Siti Rahma, M.Pd.", ruangan: "R. 102", kapasitas: 36, jumlahSiswa: 2, tahunAjaran: "2025/2026", isAktif: true },
  { id: "r3", namaRombel: "XI IPA 1", tingkat: "XI", waliKelas: "Eko Prasetyo, S.T.", ruangan: "R. 201", kapasitas: 32, jumlahSiswa: 0, tahunAjaran: "2025/2026", isAktif: false },
]

const initialStudents: Student[] = [
  { id: "s1", nisn: "0051234561", nama: "Ahmad Rizky", jenisKelamin: "L", rombelId: "r1" },
  { id: "s2", nisn: "0051234562", nama: "Amanda Citra", jenisKelamin: "P", rombelId: "r1" },
  { id: "s3", nisn: "0051234563", nama: "Bagus Pratama", jenisKelamin: "L", rombelId: "r1" },
  { id: "s4", nisn: "0051234564", nama: "Dina Mariana", jenisKelamin: "P", rombelId: "r2" },
  { id: "s5", nisn: "0051234565", nama: "Fajar Nugraha", jenisKelamin: "L", rombelId: "r2" },
  { id: "s6", nisn: "0051234566", nama: "Gilang Ramadhan", jenisKelamin: "L", rombelId: null },
  { id: "s7", nisn: "0051234567", nama: "Hanifah Nur", jenisKelamin: "P", rombelId: null },
  { id: "s8", nisn: "0051234568", nama: "Indra Kusuma", jenisKelamin: "L", rombelId: null },
]

export default function RombelEnrollmentPage() {
  const [rombelList, setRombelList] = React.useState<Rombel[]>(initialRombel)
  const [studentList, setStudentList] = React.useState<Student[]>(initialStudents)
  
  const [activeTab, setActiveTab] = React.useState("rombel")

  const [searchRombel, setSearchRombel] = React.useState("")
  const [openRombelModal, setOpenRombelModal] = React.useState(false)
  const [editRombel, setEditRombel] = React.useState<Rombel | null>(null)
  const [rombelForm, setRombelForm] = React.useState({
    namaRombel: "",
    tingkat: "X",
    waliKelas: "",
    ruangan: "",
    kapasitas: 36,
    tahunAjaran: "2025/2026",
    isAktif: true
  })

  const [selectedRombelFilter, setSelectedRombelFilter] = React.useState<string>("r1")
  const [enrollSearch, setEnrollSearch] = React.useState("")
  const [selectedUnassigned, setSelectedUnassigned] = React.useState<string[]>([])
  const [selectedEnrolled, setSelectedEnrolled] = React.useState<string[]>([])

  const getRombelCount = (rombelId: string) => {
    return studentList.filter((s) => s.rombelId === rombelId).length
  }

  const handleSaveRombel = (e: React.FormEvent) => {
    e.preventDefault()
    if (editRombel) {
      setRombelList((prev) =>
        prev.map((r) => (r.id === editRombel.id ? { ...r, ...rombelForm } : r))
      )
    } else {
      const newRombel: Rombel = {
        id: `r${Date.now()}`,
        ...rombelForm,
        jumlahSiswa: 0
      }
      setRombelList((prev) => [...prev, newRombel])
    }
    setOpenRombelModal(false)
  }

  const handleOpenRombelModal = (rombel?: Rombel) => {
    setEditRombel(rombel || null)
    if (rombel) {
      setRombelForm({
        namaRombel: rombel.namaRombel,
        tingkat: rombel.tingkat,
        waliKelas: rombel.waliKelas,
        ruangan: rombel.ruangan,
        kapasitas: rombel.kapasitas,
        tahunAjaran: rombel.tahunAjaran,
        isAktif: rombel.isAktif
      })
    } else {
      setRombelForm({
        namaRombel: "",
        tingkat: "X",
        waliKelas: "",
        ruangan: "",
        kapasitas: 36,
        tahunAjaran: "2025/2026",
        isAktif: true
      })
    }
    setOpenRombelModal(true)
  }

  const handleEnrollSelected = () => {
    if (!selectedRombelFilter || selectedUnassigned.length === 0) return
    
    const activeRombel = rombelList.find(r => r.id === selectedRombelFilter)
    const currentCount = getRombelCount(selectedRombelFilter)
    if (activeRombel && currentCount + selectedUnassigned.length > activeRombel.kapasitas) {
      alert("Kapasitas rombel tidak mencukupi!")
      return
    }

    setStudentList((prev) =>
      prev.map((s) => (selectedUnassigned.includes(s.id) ? { ...s, rombelId: selectedRombelFilter } : s))
    )
    setSelectedUnassigned([])
  }

  const handleUnenrollSelected = () => {
    if (selectedEnrolled.length === 0) return
    setStudentList((prev) =>
      prev.map((s) => (selectedEnrolled.includes(s.id) ? { ...s, rombelId: null } : s))
    )
    setSelectedEnrolled([])
  }

  const unassignedStudents = studentList.filter(
    (s) => s.rombelId === null && (s.nama.toLowerCase().includes(enrollSearch.toLowerCase()) || s.nisn.includes(enrollSearch))
  )

  const currentEnrolledStudents = studentList.filter(
    (s) => s.rombelId === selectedRombelFilter && (s.nama.toLowerCase().includes(enrollSearch.toLowerCase()) || s.nisn.includes(enrollSearch))
  )

  const activeRombelDetail = rombelList.find(r => r.id === selectedRombelFilter)

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
         Rombongan Belajar & Enrollment
        </h1>
        <p className="text-sm text-muted-foreground">Kelola struktur rombel dan plotting siswa ke dalam kelas.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col space-y-4 w-full">
        <TabsList className="w-fit justify-start">
          <TabsTrigger value="rombel" className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" /> Data Rombel
          </TabsTrigger>
          <TabsTrigger value="enrollment" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Plotting Siswa (Enrollment)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rombel" className="space-y-4 w-full">
          <div className="flex items-center justify-between">
            <Input
              placeholder="Cari rombel, wali kelas..."
              value={searchRombel}
              onChange={(e) => setSearchRombel(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={() => handleOpenRombelModal()}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Rombel
            </Button>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>Nama Rombel</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Wali Kelas</TableHead>
                  <TableHead>Ruangan</TableHead>
                  <TableHead className="w-[180px]">Kapasitas & Terisi</TableHead>
                  <TableHead>Tahun Ajaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rombelList
                  .filter((r) => r.namaRombel.toLowerCase().includes(searchRombel.toLowerCase()) || r.waliKelas.toLowerCase().includes(searchRombel.toLowerCase()))
                  .map((item, i) => {
                    const count = getRombelCount(item.id)
                    const percent = Math.round((count / item.kapasitas) * 100)
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-bold">{item.namaRombel}</TableCell>
                        <TableCell><Badge variant="outline">{item.tingkat}</Badge></TableCell>
                        <TableCell>{item.waliKelas || "-"}</TableCell>
                        <TableCell>{item.ruangan}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{count} / {item.kapasitas} Siswa</span>
                              <span className="font-semibold">{percent}%</span>
                            </div>
                            <Progress value={percent} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.tahunAjaran}</TableCell>
                        <TableCell>
                          {item.isAktif ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">
                              Tidak Aktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="outline" size="sm" onClick={() => handleOpenRombelModal(item)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            disabled={!item.isAktif}
                            onClick={() => {
                              setSelectedRombelFilter(item.id)
                              setActiveTab("enrollment")
                            }}
                          >
                            <UserPlus className="mr-1 h-3.5 w-3.5" /> Plotting
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="enrollment" className="space-y-4 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border bg-card">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Target Rombongan Belajar</Label>
              <Select value={selectedRombelFilter} onValueChange={setSelectedRombelFilter}>
                <SelectTrigger className="w-[240px] font-bold">
                  <SelectValue placeholder="Pilih Rombel" />
                </SelectTrigger>
                <SelectContent>
                  {rombelList
                    .filter((r) => r.isAktif)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.namaRombel} ({getRombelCount(r.id)}/{r.kapasitas})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {activeRombelDetail && (
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Wali Kelas</span>
                  <span className="font-medium">{activeRombelDetail.waliKelas || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Ruangan</span>
                  <span className="font-medium">{activeRombelDetail.ruangan}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Kapasitas Tersedia</span>
                  <span className="font-bold text-primary">
                    {activeRombelDetail.kapasitas - getRombelCount(activeRombelDetail.id)} Kursi
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Siswa Belum Ada Rombel</h3>
                  <p className="text-xs text-muted-foreground">{unassignedStudents.length} siswa siap di-enroll</p>
                </div>
                <Button 
                  size="sm" 
                  disabled={selectedUnassigned.length === 0}
                  onClick={handleEnrollSelected}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" /> Masukkan ({selectedUnassigned.length})
                </Button>
              </div>

              <Input
                placeholder="Cari siswa..."
                value={enrollSearch}
                onChange={(e) => setEnrollSearch(e.target.value)}
                className="h-8 text-xs"
              />

              <div className="border rounded-md divide-y max-h-[350px] overflow-y-auto">
                {unassignedStudents.length ? (
                  unassignedStudents.map((siswa) => {
                    const isChecked = selectedUnassigned.includes(siswa.id)
                    return (
                      <div key={siswa.id} className="flex items-center justify-between p-2.5 hover:bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              setSelectedUnassigned((prev) =>
                                checked ? [...prev, siswa.id] : prev.filter((id) => id !== siswa.id)
                              )
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium leading-none">{siswa.nama}</p>
                            <p className="text-xs text-muted-foreground mt-1">NISN: {siswa.nisn} • ({siswa.jenisKelamin})</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">Tidak ada siswa tersisa.</div>
                )}
              </div>
            </div>

            <div className="rounded-md border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Anggota Rombel: {activeRombelDetail?.namaRombel}</h3>
                  <p className="text-xs text-muted-foreground">{currentEnrolledStudents.length} siswa terdaftar</p>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive"
                  disabled={selectedEnrolled.length === 0}
                  onClick={handleUnenrollSelected}
                >
                  <UserMinus className="mr-1 h-3.5 w-3.5" /> Keluar ({selectedEnrolled.length})
                </Button>
              </div>

              <Input
                placeholder="Cari anggota kelas..."
                value={enrollSearch}
                onChange={(e) => setEnrollSearch(e.target.value)}
                className="h-8 text-xs"
              />

              <div className="border rounded-md divide-y max-h-[350px] overflow-y-auto">
                {currentEnrolledStudents.length ? (
                  currentEnrolledStudents.map((siswa) => {
                    const isChecked = selectedEnrolled.includes(siswa.id)
                    return (
                      <div key={siswa.id} className="flex items-center justify-between p-2.5 hover:bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              setSelectedEnrolled((prev) =>
                                checked ? [...prev, siswa.id] : prev.filter((id) => id !== siswa.id)
                              )
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium leading-none">{siswa.nama}</p>
                            <p className="text-xs text-muted-foreground mt-1">NISN: {siswa.nisn} • ({siswa.jenisKelamin})</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Terdaftar</Badge>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">Belum ada siswa di rombel ini.</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Dialog Rombel */}
      <Dialog open={openRombelModal} onOpenChange={setOpenRombelModal}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSaveRombel} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editRombel ? "Edit" : "Tambah"} Rombongan Belajar</DialogTitle>
              <DialogDescription>Pengaturan unit kelas dan batas kapasitas siswa.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid gap-2">
                <Label htmlFor="namaRombel">Nama Rombel</Label>
                <Input
                  id="namaRombel"
                  placeholder="Contoh: X IPA 1"
                  value={rombelForm.namaRombel}
                  onChange={(e) => setRombelForm({ ...rombelForm, namaRombel: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="tingkat">Tingkat</Label>
                  <Select
                    value={rombelForm.tingkat}
                    onValueChange={(val) => setRombelForm({ ...rombelForm, tingkat: val })}
                  >
                    <SelectTrigger id="tingkat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="X">Kelas 10 (X)</SelectItem>
                      <SelectItem value="XI">Kelas 11 (XI)</SelectItem>
                      <SelectItem value="XII">Kelas 12 (XII)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="kapasitas">Kapasitas Maksimal</Label>
                  <Input
                    id="kapasitas"
                    type="number"
                    value={rombelForm.kapasitas}
                    onChange={(e) => setRombelForm({ ...rombelForm, kapasitas: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="waliKelas">Wali Kelas</Label>
                <Input
                  id="waliKelas"
                  placeholder="Nama Wali Kelas"
                  value={rombelForm.waliKelas}
                  onChange={(e) => setRombelForm({ ...rombelForm, waliKelas: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ruangan">Ruangan</Label>
                <Input
                  id="ruangan"
                  placeholder="Contoh: Lab Fisika A / R.101"
                  value={rombelForm.ruangan}
                  onChange={(e) => setRombelForm({ ...rombelForm, ruangan: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tahunAjaran">Tahun Ajaran</Label>
                <Input
                  id="tahunAjaran"
                  value={rombelForm.tahunAjaran}
                  onChange={(e) => setRombelForm({ ...rombelForm, tahunAjaran: e.target.value })}
                  required
                />
              </div>

              {/* Toggle Status Aktif */}
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="isAktif" className="text-sm font-medium">Status Rombel</Label>
                  <p className="text-xs text-muted-foreground">Rombel aktif dapat dipilih pada menu plotting.</p>
                </div>
                <Switch
                  id="isAktif"
                  checked={rombelForm.isAktif}
                  onCheckedChange={(checked) => setRombelForm({ ...rombelForm, isAktif: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenRombelModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan Rombel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}