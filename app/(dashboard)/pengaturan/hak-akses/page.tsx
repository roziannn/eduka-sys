"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

export interface RoleData {
  id: string
  code: string
  name: string
  description: string
  total_user: number
  status: "Aktif" | "Nonaktif"
}

export interface RoleUI {
  id: string
  code: string
  namaRole: string
  deskripsi: string
  jumlahPengguna: number
  status: "Aktif" | "Nonaktif"
}

const ROLES_KEY = ["roles"]

const ADMIN_ROLE_CODE = "ADMIN"

export default function HakAksesPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [openModal, setOpenModal] = React.useState(false)
  const [editingRole, setEditingRole] = React.useState<RoleUI | null>(null)

  const [formRole, setFormRole] = React.useState({
    namaRole: "",
    deskripsi: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  })

  const isAdminRole = editingRole?.code === ADMIN_ROLE_CODE

  const {
    data: rawRoles = [],
    isLoading: tableLoading,
    error: rolesError,
  } = useQuery<RoleData[]>({
    queryKey: ROLES_KEY,
    queryFn: () => fetchJson<RoleData[]>("/api/roles"),
  })

  React.useEffect(() => {
    if (rolesError) {
      toast.error(`Gagal memuat data role: ${getErrorMessage(rolesError)}`)
    }
  }, [rolesError])

  const roles: RoleUI[] = React.useMemo(
    () =>
      rawRoles.map((r) => ({
        id: r.id,
        code: r.code,
        namaRole: r.name,
        deskripsi: r.description,
        jumlahPengguna: r.total_user,
        status: r.status,
      })),
    [rawRoles]
  )

  const saveRoleMutation = useMutation({
    mutationFn: (input: { id?: string; body: Record<string, unknown> }) =>
      fetchJson(input.id ? `/api/roles/${input.id}` : "/api/roles", {
        method: input.id ? "PUT" : "POST",
        body: input.body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  })

  // ---------- HANDLERS ----------
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

  const handleSaveRole = () => {
    if (!formRole.namaRole.trim()) {
      toast.error("Nama Role wajib diisi!")
      return
    }

    const isEdit = Boolean(editingRole)

    saveRoleMutation.mutate(
      {
        id: editingRole?.id,
        body: {
          ...formRole,
          status: isAdminRole ? "Aktif" : formRole.status,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            `Role "${formRole.namaRole}" berhasil ${isEdit ? "diperbarui" : "ditambahkan"}!`
          )
          setOpenModal(false)
        },
        onError: (err) => {
          toast.error(
            `${isEdit ? "Gagal memperbarui" : "Gagal menambah"} role: ${getErrorMessage(err)}`
          )
        },
      }
    )
  }

  const filteredRoles = React.useMemo(() => {
    const keyword = search.toLowerCase()
    return roles.filter(
      (r) =>
        r.namaRole.toLowerCase().includes(keyword) ||
        r.deskripsi.toLowerCase().includes(keyword) ||
        r.code.toLowerCase().includes(keyword)
    )
  }, [roles, search])

  return (
    <div className="space-y-4">
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRoles.length ? (
              filteredRoles.map((role, idx) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground">{role.namaRole}</span>
                  </TableCell>
                  <TableCell className="text-sm">{role.deskripsi || "-"}</TableCell>
                  <TableCell className="text-sm">{role.jumlahPengguna} User</TableCell>
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
            <Button variant="outline" onClick={() => setOpenModal(false)} disabled={saveRoleMutation.isPending}>
              Batal
            </Button>
            <Button onClick={handleSaveRole} disabled={saveRoleMutation.isPending}>
              {saveRoleMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}