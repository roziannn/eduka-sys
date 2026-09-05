"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, Settings, Search, CheckCircle2, XCircle, Loader2, Edit } from "lucide-react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getRoles, createRole, updateRole, RoleData } from "./actions"

export interface RoleUI {
  id: string
  code: string
  namaRole: string
  deskripsi: string
  jumlahPengguna: number
  status: "Aktif" | "Nonaktif"
}

export default function HakAksesPage() {
  const [roles, setRoles] = React.useState<RoleUI[]>([])
  const [tableLoading, setTableLoading] = React.useState(true)
  const [formLoading, setFormLoading] = React.useState(false)
  const [search, setSearch] = React.useState("")
  
  const [openModal, setOpenModal] = React.useState(false)
  const [editingRole, setEditingRole] = React.useState<RoleUI | null>(null)

  // Form State
  const [formRole, setFormRole] = React.useState({
    namaRole: "",
    deskripsi: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  })

  // Cek apakah role yang sedang diedit adalah Administrator
  const isAdminRole = editingRole?.code === "ADMINISTRATOR"

  // --- FETCH DATA ROLE DARI SUPABASE ---
  const fetchRolesData = React.useCallback(async () => {
    setTableLoading(true)
    const res = await getRoles()
    if (res.error) {
      toast.error(`Gagal memuat data role: ${res.error}`)
    } else if (res.data) {
      const formatted = res.data.map((r: RoleData) => ({
        id: r.id,
        code: r.code,
        namaRole: r.name,
        deskripsi: r.description || "-",
        jumlahPengguna: r.total_user || 0,
        status: r.status,
      }))
      setRoles(formatted)
    }
    setTableLoading(false)
  }, [])

  React.useEffect(() => {
    fetchRolesData()
  }, [fetchRolesData])

  // --- HANDLER MODAL ---
  const handleOpenAdd = () => {
    setEditingRole(null)
    setFormRole({ namaRole: "", deskripsi: "", status: "Aktif" })
    setOpenModal(true)
  }

  const handleOpenEdit = (role: RoleUI) => {
    setEditingRole(role)
    setFormRole({ namaRole: role.namaRole, deskripsi: role.deskripsi, status: role.status })
    setOpenModal(true)
  }

  // --- HANDLER SAVE (CREATE / UPDATE) ---
  const handleSaveRole = async () => {
    if (!formRole.namaRole) {
      toast.error("Nama Role wajib diisi!")
      return
    }

    // Protection Check: Pastikan Administrator tidak bisa di-nonaktifkan
    const targetStatus = isAdminRole ? "Aktif" : formRole.status

    setFormLoading(true)

    if (editingRole) {
      // PROSES EDIT / UPDATE
      const res = await updateRole(editingRole.id, {
        namaRole: formRole.namaRole,
        deskripsi: formRole.deskripsi,
        status: targetStatus,
      })

      if (res.error) {
        toast.error(`Gagal memperbarui role: ${res.error}`)
      } else {
        toast.success(`Role "${formRole.namaRole}" berhasil diperbarui!`)
        await fetchRolesData()
        setOpenModal(false)
      }
    } else {
      // PROSES TAMBAH BARU
      const res = await createRole({
        namaRole: formRole.namaRole,
        deskripsi: formRole.deskripsi,
        status: formRole.status,
      })

      if (res.error) {
        toast.error(`Gagal menambah role: ${res.error}`)
      } else {
        toast.success(`Role "${formRole.namaRole}" berhasil ditambahkan!`)
        await fetchRolesData()
        setOpenModal(false)
      }
    }

    setFormLoading(false)
  }

  const filteredRoles = React.useMemo(() => {
    return roles.filter(
      (r) =>
        r.namaRole.toLowerCase().includes(search.toLowerCase()) ||
        r.deskripsi.toLowerCase().includes(search.toLowerCase()) ||
        r.code.toLowerCase().includes(search.toLowerCase())
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

        <Button onClick={handleOpenAdd}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Role Baru
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama role, kode, deskripsi..."
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
              <TableHead className="w-[140px]">Jumlah</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="text-center w-[140px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data role dari Supabase...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRoles.length ? (
              filteredRoles.map((role, idx) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{role.namaRole}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{role.deskripsi}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span>{role.jumlahPengguna} User</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {role.status === "Aktif" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 hover:bg-emerald-500/20 text-[10px] gap-1 shadow-none">
                        <CheckCircle2 className="h-3 w-3" /> Aktif
                      </Badge>
                    ) : (
                      <Badge className="bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive/20 text-[10px] gap-1 shadow-none">
                        <XCircle className="h-3 w-3" /> Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-muted"
                        title="Edit Role"
                        onClick={() => handleOpenEdit(role)}
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      
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
                    </div>
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

      {/* DIALOG TAMBAH / EDIT ROLE */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Tambah Role Baru"}</DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Perbarui informasi peran hak akses pengguna."
                : "Buat grup peran baru untuk mengelompokkan pengguna dan hak aksesnya."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label>Nama Role <span className="text-destructive">*</span></Label>
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

            {editingRole && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Status Operational</Label>
                  {isAdminRole && (
                    <span className="text-xs text-muted-foreground">
                      (Status role tidak dapat diubah)
                    </span>
                  )}
                </div>

                <Select
                  value={isAdminRole ? "Aktif" : formRole.status}
                  disabled={isAdminRole}
                  onValueChange={(val) => {
                    if (val && !isAdminRole) {
                      setFormRole({ ...formRole, status: val as "Aktif" | "Nonaktif" })
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={formLoading}>
              Batal
            </Button>
            <Button onClick={handleSaveRole} disabled={formLoading}>
              {formLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}