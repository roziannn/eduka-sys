"use client"

import * as React from "react"
import Link from "next/link"
import { Shield, Plus, Settings, Users, Search, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface Role {
  id: string
  namaRole: string
  deskripsi: string
  jumlahPengguna: number
  totalAksesMenu: number
  status: "Aktif" | "Nonaktif"
}

const initialRoles: Role[] = [
  { id: "r-1", namaRole: "Administrator", deskripsi: "Akses penuh ke seluruh modul sistem eduka", jumlahPengguna: 3, totalAksesMenu: 12, status: "Aktif" },
  { id: "r-2", namaRole: "Guru / Pengajar", deskripsi: "Akses kelola bank soal, ujian, kuis, dan nilai siswa", jumlahPengguna: 42, totalAksesMenu: 8, status: "Aktif" },
  { id: "r-3", namaRole: "Siswa", deskripsi: "Akses pengerjaan kuis, ujian, dan melihat hasil nilai", jumlahPengguna: 850, totalAksesMenu: 4, status: "Aktif" },
];

export default function HakAksesPage() {
  const [roles, setRoles] = React.useState<Role[]>(initialRoles)
  const [search, setSearch] = React.useState("")
  const [openAddRoleModal, setOpenAddRoleModal] = React.useState(false)

  // Form State
  const [formRole, setFormRole] = React.useState({
    namaRole: "",
    deskripsi: "",
  })

  const handleSaveRole = () => {
    if (!formRole.namaRole) return

    const newRole: Role = {
      id: `r-${Date.now()}`,
      namaRole: formRole.namaRole,
      deskripsi: formRole.deskripsi || "-",
      jumlahPengguna: 0,
      totalAksesMenu: 0,
      status: "Aktif",
    }

    setRoles((prev) => [...prev, newRole])
    setFormRole({ namaRole: "", deskripsi: "" })
    setOpenAddRoleModal(false)
  }

  const filteredRoles = React.useMemo(() => {
    return roles.filter(
      (r) =>
        r.namaRole.toLowerCase().includes(search.toLowerCase()) ||
        r.deskripsi.toLowerCase().includes(search.toLowerCase())
    )
  }, [roles, search])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
             Pengaturan Hak Akses
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola peran pengguna dan atribusi izin akses menu serta tombol tindakan.
          </p>
        </div>

        <Button onClick={() => setOpenAddRoleModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Role Baru
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama role atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">Total: {roles.length} Role</span>
      </div>

      {/* Tabel Master Role */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">No</TableHead>
              <TableHead className="w-[200px]">Nama Role</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="w-[140px]">Jumlah Pengguna</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="text-center w-[120px]">Atur Akses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.length ? (
              filteredRoles.map((role, idx) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-foreground">{role.namaRole}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{role.deskripsi}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>{role.jumlahPengguna} User</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {role.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/pengaturan/hak-akses/${role.id}`}>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 hover:border-primary hover:text-primary"
                        title="Atur Hak Akses Menu & Button"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Data role tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG TAMBAH ROLE */}
      <Dialog open={openAddRoleModal} onOpenChange={setOpenAddRoleModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Tambah Role Baru</DialogTitle>
            <DialogDescription>
              Buat grup peran baru untuk mengelompokkan pengguna dan hak aksesnya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label>Nama Role</Label>
              <Input
                placeholder="Contoh: Kurikulum, Wali Kelas"
                value={formRole.namaRole}
                onChange={(e) => setFormRole({ ...formRole, namaRole: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi Role</Label>
              <Textarea
                placeholder="Jelaskan cakupan wewenang role ini..."
                value={formRole.deskripsi}
                onChange={(e) => setFormRole({ ...formRole, deskripsi: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddRoleModal(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveRole}>Simpan Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}