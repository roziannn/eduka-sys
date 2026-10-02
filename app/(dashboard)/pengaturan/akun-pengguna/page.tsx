"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, KeyRound, Search, Shield, GraduationCap, UserCheck, CheckCircle2, XCircle, Mail, ChevronLeft, ChevronRight, Loader2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

export type RoleType = "ADMINISTRATOR" | "GURU" | "SISWA"

export interface UserAccount {
  id: string
  nama: string
  email: string
  nipNisn: string
  role: RoleType
  status: "Aktif" | "Nonaktif"
  lastLogin: string
}

const USERS_KEY = ["users"]

export default function PengaturanPenggunaPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("All")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const [openUserModal, setOpenUserModal] = React.useState(false)
  const [openResetPasswordModal, setOpenResetPasswordModal] = React.useState(false)

  const [editingUser, setEditingUser] = React.useState<UserAccount | null>(null)
  const [targetResetUser, setTargetResetUser] = React.useState<UserAccount | null>(null)

  const [formUser, setFormUser] = React.useState({
    nama: "", email: "", nipNisn: "", role: "GURU" as RoleType, status: "Aktif" as "Aktif" | "Nonaktif", password: "",
  })

  const [newPassword, setNewPassword] = React.useState("")

  // ---------- DATA ----------
  const {
    data: users = [],
    isLoading: tableLoading,
    error: usersError,
  } = useQuery<UserAccount[]>({
    queryKey: USERS_KEY,
    queryFn: () => fetchJson<UserAccount[]>("/api/users"),
  })

  React.useEffect(() => {
    if (usersError) {
      toast.error(`Gagal memuat data pengguna: ${getErrorMessage(usersError)}`)
    }
  }, [usersError])

  const saveUserMutation = useMutation({
    mutationFn: (input: { id?: string; body: Record<string, unknown> }) =>
      fetchJson(input.id ? `/api/users/${input.id}` : "/api/users", {
        method: input.id ? "PUT" : "POST",
        body: input.body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (input: { id: string; newPassword: string }) =>
      fetchJson(`/api/users/${input.id}/reset-password`, {
        method: "POST",
        body: { newPassword: input.newPassword },
      }),
  })

  // ---------- HANDLERS ----------
  const handleOpenAddUser = () => {
    setEditingUser(null)
    setErrorMsg(null)
    setFormUser({ nama: "", email: "", nipNisn: "", role: "GURU", status: "Aktif", password: "" })
    setOpenUserModal(true)
  }

  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUser(user)
    setErrorMsg(null)
    setFormUser({ nama: user.nama, email: user.email, nipNisn: user.nipNisn, role: user.role, status: user.status, password: "" })
    setOpenUserModal(true)
  }

  const handleSaveUser = () => {
    if (!formUser.nama || !formUser.email) return
    setErrorMsg(null)

    // password hanya dikirim saat tambah pengguna baru
    const { password, ...profile } = formUser
    const isEdit = Boolean(editingUser)

    saveUserMutation.mutate(
      {
        id: editingUser?.id,
        body: isEdit ? profile : { ...profile, password },
      },
      {
        onSuccess: () => {
          toast.success(
            isEdit
              ? "Data pengguna berhasil diperbarui!"
              : `Pengguna ${formUser.nama} berhasil ditambahkan!`
          )
          setOpenUserModal(false)
        },
        onError: (err) => {
          const message = getErrorMessage(err)
          setErrorMsg(message)
          toast.error(`${isEdit ? "Gagal memperbarui" : "Gagal membuat"} pengguna: ${message}`)
        },
      }
    )
  }

  const handleOpenResetPassword = (user: UserAccount) => {
    setTargetResetUser(user)
    setNewPassword("")
    setOpenResetPasswordModal(true)
  }

  const handleSaveResetPassword = () => {
    if (!newPassword || !targetResetUser) return

    resetPasswordMutation.mutate(
      { id: targetResetUser.id, newPassword },
      {
        onSuccess: () => {
          toast.success(`Password untuk ${targetResetUser.nama} berhasil diperbarui!`)
          setOpenResetPasswordModal(false)
        },
        onError: (err) => {
          toast.error(`Gagal mereset password: ${getErrorMessage(err)}`)
        },
      }
    )
  }

  // ---------- FILTER & PAGINATION ----------
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.nama.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.nipNisn.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === "All" || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case "ADMINISTRATOR": return <Badge className="bg-purple-600 hover:bg-purple-700 text-[10px] gap-1"><Shield className="h-3 w-3" /> Admin</Badge>
      case "GURU": return <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px] gap-1"><GraduationCap className="h-3 w-3" /> Guru</Badge>
      case "SISWA": return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] gap-1"><UserCheck className="h-3 w-3" /> Siswa</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">Pengaturan Akun Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola data akun pengguna, penetapan peran, dan pengaturan kredensial login.</p>
        </div>
        <Button onClick={handleOpenAddUser}><Plus className="mr-2 h-4 w-4" /> Tambah Pengguna Baru</Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, email, NIP/NISN..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-8" />
          </div>

          <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val || "All"); setPage(1) }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Semua Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Semua Role</SelectItem>
              <SelectItem value="ADMINISTRATOR">Administrator</SelectItem>
              <SelectItem value="GURU">Guru</SelectItem>
              <SelectItem value="SISWA">Siswa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">Total: {filteredUsers.length} Pengguna</span>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>NIP/NISN</TableHead>
              <TableHead className="w-[120px]">Role</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[140px]">Login Terakhir</TableHead>
              <TableHead className="w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length ? (
              paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-semibold text-foreground">{user.nama}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Mail className="h-3 w-3 text-primary" />
                      <span>{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.nipNisn}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.status === "Aktif" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 hover:bg-emerald-500/20 text-[10px] gap-1 shadow-none">
                        <CheckCircle2 className="h-3 w-3" /> Aktif
                      </Badge>
                    ) : (
                      <Badge className="bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive/20 text-[10px] gap-1 shadow-none">
                        <XCircle className="h-3 w-3" /> Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{user.lastLogin}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Reset Password" onClick={() => handleOpenResetPassword(user)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit Pengguna" onClick={() => handleOpenEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Data akun pengguna tidak ditemukan.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Baris per halaman</span>
            <Select value={String(pageSize)} onValueChange={(v) => { if (v) setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className="h-8 w-[65px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 20].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span>Halaman {page} dari {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={openUserModal} onOpenChange={setOpenUserModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Akun Pengguna" : "Tambah Pengguna Baru"}</DialogTitle>
            <DialogDescription>Isi kelengkapan data profil dan opsi peran akses akun.</DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-md bg-destructive/15 p-3 text-xs text-destructive font-medium text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input placeholder="Contoh: Budi Santoso, S.Pd" value={formUser.nama} onChange={(e) => setFormUser({ ...formUser, nama: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Email Akun <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="nama@eduka.com" value={formUser.email} onChange={(e) => setFormUser({ ...formUser, email: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>NIP / NISN</Label>
              <Input placeholder="Nomor identitas pegawai/siswa" value={formUser.nipNisn} onChange={(e) => setFormUser({ ...formUser, nipNisn: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Peran <span className="text-destructive">*</span></Label>
                <Select value={formUser.role} onValueChange={(val) => { if (val) setFormUser({ ...formUser, role: val as RoleType }) }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMINISTRATOR">ADMINISTRATOR</SelectItem>
                    <SelectItem value="GURU">GURU</SelectItem>
                    <SelectItem value="SISWA">SISWA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status Akun <span className="text-destructive">*</span></Label>
                <Select value={formUser.status} onValueChange={(val) => { if (val) setFormUser({ ...formUser, status: val as "Aktif" | "Nonaktif" }) }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-1.5">
                <Label>Kata Sandi Awal <span className="text-destructive">*</span></Label>
                <Input type="password" placeholder="••••••••" value={formUser.password} onChange={(e) => setFormUser({ ...formUser, password: e.target.value })} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUserModal(false)} disabled={saveUserMutation.isPending}>Batal</Button>
            <Button onClick={handleSaveUser} disabled={saveUserMutation.isPending}>
              {saveUserMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Simpan Pengguna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG RESET PASSWORD */}
      <Dialog open={openResetPasswordModal} onOpenChange={setOpenResetPasswordModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-600" /> Reset Password</DialogTitle>
            <DialogDescription>Atur ulang password untuk akun: <strong className="text-foreground">{targetResetUser?.nama}</strong></DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label>Kata Sandi Baru</Label>
              <Input type="password" placeholder="Masukkan kata sandi baru..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenResetPasswordModal(false)} disabled={resetPasswordMutation.isPending}>Batal</Button>
            <Button onClick={handleSaveResetPassword} disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : "Perbarui Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}