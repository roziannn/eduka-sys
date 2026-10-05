"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, KeyRound, Search, Shield, GraduationCap, UserCheck, CheckCircle2, XCircle, Mail, ChevronLeft, ChevronRight, Loader2, Edit, ArrowRightLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"
import { Can } from "@/components/access-provider"

export type RoleType = "ADMINISTRATOR" | "GURU" | "SISWA"

export interface UserAccount {
  id: string
  nama: string
  email: string
  nipNisn: string
  role: RoleType
  status: "Aktif" | "Nonaktif"
  lastLogin: string
  kelasId: string | null
  kelas: string | null
}

// Bentuk data dari GET /api/kelas dan GET /api/tahun-ajaran (hanya field yang dipakai di sini)
interface KelasItem {
  id: string
  namaKelas: string
  isAktif: boolean
}

interface TahunAjaranItem {
  id: string
  tahun: string
  semester: string
  isAktif: boolean
}

interface BulkAssignment {
  userId: string
  kelasId: string | null
}

const USERS_KEY = ["users"]
// Sama dengan key di halaman Data Kelas dan Tahun Ajaran, jadi cache dipakai bersama
const KELAS_KEY = ["kelas"]
const TAHUN_AJARAN_KEY = ["tahun-ajaran"]

// Nilai khusus untuk "belum ada kelas" di dropdown form
const NO_KELAS = "NO_KELAS"

// Filter kelas (hanya saat filter Role = Siswa)
const KELAS_ALL = "ALL"
const KELAS_NONE = "NONE"

// Pilihan tujuan per kelompok di dialog Pindah / Naik Kelas
const TARGET_SKIP = "SKIP"
const TARGET_REMOVE = "REMOVE"
const KEY_NONE = "NONE" // kunci kelompok siswa yang belum punya kelas

// "2025/2026" -> "2026/2027". Kosong kalau formatnya tidak dikenali.
const nextTahun = (tahun: string) => {
  const m = /^(\d{4})\/(\d{4})$/.exec(tahun)
  return m ? `${Number(m[2])}/${Number(m[2]) + 1}` : ""
}

export default function PengaturanPenggunaPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("All")
  const [kelasFilter, setKelasFilter] = React.useState(KELAS_ALL)
  // Tahun ajaran yang kelasnya ditampilkan. Kosong = tahun ajaran yang sedang aktif.
  const [kelasTahun, setKelasTahun] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const [openUserModal, setOpenUserModal] = React.useState(false)
  const [openResetPasswordModal, setOpenResetPasswordModal] = React.useState(false)

  const [editingUser, setEditingUser] = React.useState<UserAccount | null>(null)
  const [targetResetUser, setTargetResetUser] = React.useState<UserAccount | null>(null)

  const [formUser, setFormUser] = React.useState({
    nama: "",
    email: "",
    nipNisn: "",
    role: "GURU" as RoleType,
    status: "Aktif" as "Aktif" | "Nonaktif",
    password: "",
    kelasId: "", // "" = belum ada kelas
  })

  const [newPassword, setNewPassword] = React.useState("")

  // Pilihan siswa untuk proses massal
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  // Dialog Pindah / Naik Kelas
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [bulkTahun, setBulkTahun] = React.useState("")
  const [bulkTargets, setBulkTargets] = React.useState<Record<string, string>>({})
  const [bulkExcluded, setBulkExcluded] = React.useState<Set<string>>(new Set())
  const [bulkExpanded, setBulkExpanded] = React.useState<Set<string>>(new Set())

  // ---------- DATA ----------
  // Parameter tahun ajaran hanya dikirim kalau dipilih manual, supaya default memakai tahun aktif di server
  const {
    data: users = [],
    isLoading: tableLoading,
    error: usersError,
  } = useQuery<UserAccount[]>({
    queryKey: [...USERS_KEY, kelasTahun || "aktif"],
    queryFn: () =>
      fetchJson<UserAccount[]>(
        `/api/users${kelasTahun ? `?tahunAjaran=${encodeURIComponent(kelasTahun)}` : ""}`
      ),
  })

  const { data: kelasData = [], error: kelasError } = useQuery<KelasItem[]>({
    queryKey: KELAS_KEY,
    queryFn: () => fetchJson<KelasItem[]>("/api/kelas"),
  })

  const { data: tahunData = [], error: tahunError } = useQuery<TahunAjaranItem[]>({
    queryKey: TAHUN_AJARAN_KEY,
    queryFn: () => fetchJson<TahunAjaranItem[]>("/api/tahun-ajaran"),
  })

  React.useEffect(() => {
    if (usersError) {
      toast.error(`Gagal memuat data pengguna: ${getErrorMessage(usersError)}`)
    }
  }, [usersError])

  React.useEffect(() => {
    if (kelasError) toast.error(`Gagal memuat data kelas: ${getErrorMessage(kelasError)}`)
  }, [kelasError])

  React.useEffect(() => {
    if (tahunError) toast.error(`Gagal memuat tahun ajaran: ${getErrorMessage(tahunError)}`)
  }, [tahunError])

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

  const bulkMutation = useMutation({
    mutationFn: (body: { tahunAjaran: string; assignments: BulkAssignment[] }) =>
      fetchJson<{ moved: number; removed: number }>("/api/users/kelas-bulk", {
        method: "POST",
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  })

  // ---------- TAHUN AJARAN & KELAS ----------
  const tahunAktif = tahunData.find((t) => t.isAktif)?.tahun ?? ""
  // Tahun ajaran yang kelasnya sedang ditampilkan di tabel
  const tahunTampil = kelasTahun || tahunAktif
  // Sedang melihat tahun ajaran lain dari yang aktif
  const lihatTahunLain = Boolean(kelasTahun) && kelasTahun !== tahunAktif

  // Daftar tahun ajaran dari master, terbaru di atas
  const tahunMaster = Array.from(new Set(tahunData.map((t) => t.tahun))).sort((a, b) =>
    b.localeCompare(a)
  )
  // Tujuan naik kelas: tahun ajaran di master, ditambah tahun berikutnya (belum tentu sudah dibuat)
  const tahunBerikut = nextTahun(tahunMaster[0] ?? "")
  const tahunTujuanOptions = Array.from(
    new Set([...(tahunBerikut ? [tahunBerikut] : []), ...tahunMaster])
  )

  // Kelas nonaktif tetap muncul kalau sudah terpilih
  const kelasOptions = kelasData.filter((k) => k.isAktif || k.id === formUser.kelasId)
  const kelasTerpilih = kelasData.find((k) => k.id === formUser.kelasId)
  const kelasAktif = kelasData.filter((k) => k.isAktif)

  const isSiswaView = roleFilter === "SISWA"

  const kelasFilterLabel =
    kelasFilter === KELAS_ALL
      ? "Semua Kelas"
      : kelasFilter === KELAS_NONE
      ? "Belum ada kelas"
      : kelasData.find((k) => k.id === kelasFilter)?.namaKelas ?? "Kelas"

  // ---------- PILIHAN SISWA ----------
  const resetSelection = () => setSelected(new Set())

  // ---------- HANDLERS ----------
  const handleOpenAddUser = () => {
    setEditingUser(null)
    setErrorMsg(null)
    setFormUser({ nama: "", email: "", nipNisn: "", role: "GURU", status: "Aktif", password: "", kelasId: "" })
    setOpenUserModal(true)
  }

  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUser(user)
    setErrorMsg(null)
    setFormUser({
      nama: user.nama,
      email: user.email,
      nipNisn: user.nipNisn,
      role: user.role,
      status: user.status,
      password: "",
      kelasId: user.kelasId ?? "",
    })
    setOpenUserModal(true)
  }

  const handleSaveUser = () => {
    if (!formUser.nama || !formUser.email) return
    setErrorMsg(null)

    // Kelas di form selalu berlaku untuk tahun ajaran aktif. Saat tabel menampilkan tahun ajaran lain,
    // kelas siswa yang diedit tidak dikirim (server tidak mengubahnya).
    const kelasDikelola = !(editingUser && lihatTahunLain)

    // password hanya dikirim saat tambah pengguna baru.
    // kelasId hanya berarti untuk siswa, selain itu selalu null.
    const { password, kelasId, ...profile } = formUser
    const isEdit = Boolean(editingUser)
    const body = {
      ...profile,
      ...(kelasDikelola
        ? { kelasId: formUser.role === "SISWA" && kelasId ? kelasId : null }
        : {}),
    }

    saveUserMutation.mutate(
      {
        id: editingUser?.id,
        body: isEdit ? body : { ...body, password },
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
    const keyword = search.toLowerCase()

    return users.filter((u) => {
      const matchesSearch =
        u.nama.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword) ||
        u.nipNisn.toLowerCase().includes(keyword) ||
        (u.kelas ?? "").toLowerCase().includes(keyword)
      const matchesRole = roleFilter === "All" || u.role === roleFilter
      const matchesKelas =
        !isSiswaView ||
        kelasFilter === KELAS_ALL ||
        (kelasFilter === KELAS_NONE ? !u.kelasId : u.kelasId === kelasFilter)
      return matchesSearch && matchesRole && matchesKelas
    })
  }, [users, search, roleFilter, kelasFilter, isSiswaView])

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1
  const currentPage = Math.min(page, totalPages)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Pilihan di tabel
  const pageIds = paginatedUsers.map((u) => u.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const allFilteredSelected =
    filteredUsers.length > 0 && filteredUsers.every((u) => selected.has(u.id))

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAllPage = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })

  const selectAllFiltered = () => setSelected(new Set(filteredUsers.map((u) => u.id)))

  // ---------- PINDAH / NAIK KELAS MASSAL ----------
  // Siswa terpilih dikelompokkan berdasarkan kelas asal (pada tahun ajaran yang ditampilkan)
  const bulkGroups = React.useMemo(() => {
    const map = new Map<string, { key: string; nama: string; users: UserAccount[] }>()

    for (const u of users) {
      if (!selected.has(u.id)) continue
      const key = u.kelasId ?? KEY_NONE
      const group = map.get(key) ?? { key, nama: u.kelas ?? "Belum ada kelas", users: [] }
      group.users.push(u)
      map.set(key, group)
    }

    return Array.from(map.values()).sort((a, b) =>
      a.key === KEY_NONE
        ? 1
        : b.key === KEY_NONE
        ? -1
        : a.nama.localeCompare(b.nama, "id", { numeric: true })
    )
  }, [users, selected])

  // Ringkasan dan data yang akan dikirim
  const bulkSummary = React.useMemo(() => {
    let moved = 0
    let removed = 0
    let skipped = 0
    const assignments: BulkAssignment[] = []

    for (const group of bulkGroups) {
      const target = bulkTargets[group.key] ?? TARGET_SKIP

      for (const u of group.users) {
        if (bulkExcluded.has(u.id) || target === TARGET_SKIP) {
          skipped++
        } else if (target === TARGET_REMOVE) {
          removed++
          assignments.push({ userId: u.id, kelasId: null })
        } else {
          moved++
          assignments.push({ userId: u.id, kelasId: target })
        }
      }
    }

    return { moved, removed, skipped, assignments }
  }, [bulkGroups, bulkTargets, bulkExcluded])

  // Memindahkan di tahun ajaran yang sama (kelas lama diganti), bukan naik ke tahun lain
  const bulkSameYear = bulkTahun !== "" && bulkTahun === tahunTampil

  const targetLabel = (value: string) =>
    value === TARGET_SKIP
      ? "Tidak diubah"
      : value === TARGET_REMOVE
      ? "Cabut dari kelas"
      : kelasData.find((k) => k.id === value)?.namaKelas ?? "Pilih kelas"

  const handleOpenBulk = () => {
    setBulkTahun(nextTahun(tahunTampil) || tahunTampil)
    setBulkTargets({})
    setBulkExcluded(new Set())
    setBulkExpanded(new Set())
    setBulkOpen(true)
  }

  // "Cabut dari kelas" hanya masuk akal di tahun ajaran yang sama. Di tahun lain, tidak ada kelas yang dicabut.
  const handleBulkTahunChange = (tahun: string) => {
    setBulkTahun(tahun)
    if (tahun !== tahunTampil) {
      setBulkTargets((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([key, value]) => [
            key,
            value === TARGET_REMOVE ? TARGET_SKIP : value,
          ])
        )
      )
    }
  }

  const toggleExcluded = (id: string) =>
    setBulkExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleExpanded = (key: string) =>
    setBulkExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const handleApplyBulk = () => {
    if (bulkSummary.assignments.length === 0 || !bulkTahun) return

    bulkMutation.mutate(
      { tahunAjaran: bulkTahun, assignments: bulkSummary.assignments },
      {
        onSuccess: (res) => {
          const parts = [
            res.moved > 0 ? `${res.moved} siswa dikelaskan` : "",
            res.removed > 0 ? `${res.removed} siswa dicabut dari kelas` : "",
          ].filter(Boolean)

          toast.success(`Berhasil: ${parts.join(", ") || "tidak ada perubahan"}.`, {
            description:
              bulkTahun !== tahunTampil
                ? `Kelas baru tersimpan untuk tahun ajaran ${bulkTahun}. Pilih tahun itu di filter untuk melihatnya.`
                : undefined,
          })
          setBulkOpen(false)
          resetSelection()
        },
        onError: (err) => {
          toast.error(`Gagal memproses kelas: ${getErrorMessage(err)}`)
        },
      }
    )
  }

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case "ADMINISTRATOR": return <Badge className="bg-purple-600 hover:bg-purple-700 text-[10px] gap-1"><Shield className="h-3 w-3" /> Admin</Badge>
      case "GURU": return <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px] gap-1"><GraduationCap className="h-3 w-3" /> Guru</Badge>
      case "SISWA": return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px] gap-1"><UserCheck className="h-3 w-3" /> Siswa</Badge>
    }
  }

  // Kolom: 7 dasar (nama, email, nip, role, status, login terakhir, aksi) + checkbox dan kelas saat filter Siswa
  const colCount = 7 + (isSiswaView ? 2 : 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">Pengaturan Akun Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola data akun pengguna, penetapan peran, dan pengaturan kredensial login.</p>
        </div>
        <Can code="btn-add">
          <Button onClick={handleOpenAddUser}><Plus className="mr-2 h-4 w-4" /> Tambah Pengguna Baru</Button>
        </Can>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative max-w-xs w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, NIP/NISN, kelas..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetSelection(); setPage(1) }}
              className="pl-8"
            />
          </div>

          <Select
            value={roleFilter}
            onValueChange={(val) => {
              const next = val || "All"
              setRoleFilter(next)
              if (next !== "SISWA") setKelasFilter(KELAS_ALL)
              resetSelection()
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Semua Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Semua Role</SelectItem>
              <SelectItem value="ADMINISTRATOR">Administrator</SelectItem>
              <SelectItem value="GURU">Guru</SelectItem>
              <SelectItem value="SISWA">Siswa</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter khusus siswa: tahun ajaran yang kelasnya ditampilkan, dan kelas */}
          {isSiswaView && (
            <>
              <Select
                value={tahunTampil}
                onValueChange={(v) => {
                  if (!v) return
                  setKelasTahun(v === tahunAktif ? "" : v)
                  setKelasFilter(KELAS_ALL)
                  resetSelection()
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue>{tahunTampil ? `Kelas ${tahunTampil}` : "Tahun ajaran"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tahunMaster.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}{t === tahunAktif ? " (aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={kelasFilter}
                onValueChange={(v) => {
                  if (!v) return
                  setKelasFilter(v)
                  resetSelection()
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue>{kelasFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KELAS_ALL}>Semua Kelas</SelectItem>
                  <SelectItem value={KELAS_NONE}>Belum ada kelas</SelectItem>
                  {kelasData.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">Total: {filteredUsers.length} Pengguna</span>
      </div>

      {/* Bar aksi massal: muncul kalau ada siswa dicentang */}
      {isSiswaView && selected.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} siswa dipilih</span>
          <div className="flex flex-wrap items-center gap-2">
            {!allFilteredSelected && (
              <Button size="sm" variant="ghost" onClick={selectAllFiltered}>
                Pilih semua {filteredUsers.length} hasil filter
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={resetSelection}>Batal pilih</Button>
            <Button size="sm" onClick={handleOpenBulk}>
              Pindah / Naik Kelas
            </Button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {isSiswaView && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleAllPage}
                    aria-label="Pilih semua siswa di halaman ini"
                  />
                </TableHead>
              )}
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>NIP / NISN</TableHead>
              <TableHead className="w-[120px]">Role</TableHead>
              {isSiswaView && (
                <TableHead className="w-[160px]">
                  Kelas{tahunTampil ? ` (${tahunTampil})` : ""}
                </TableHead>
              )}
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[140px]">Login Terakhir</TableHead>
              <TableHead className="w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableLoading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length ? (
              paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  {isSiswaView && (
                    <TableCell>
                      <Checkbox
                        checked={selected.has(user.id)}
                        onCheckedChange={() => toggleOne(user.id)}
                        aria-label={`Pilih ${user.nama}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-semibold text-foreground">{user.nama}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Mail className="h-3 w-3 text-primary" />
                      <span>{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{user.nipNisn}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>

                  {/* KELAS: hanya tampil saat filter Siswa */}
                  {isSiswaView && (
                    <TableCell>
                      {user.kelas ? (
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-medium bg-blue-100/50 text-foreground border"
                        >
                          {user.kelas}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          Belum ada kelas
                        </Badge>
                      )}
                    </TableCell>
                  )}

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
                      <Can code="btn-reset-password">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Reset Password" onClick={() => handleOpenResetPassword(user)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can code="btn-edit">
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit Pengguna" onClick={() => handleOpenEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Can>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">Data akun pengguna tidak ditemukan.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Baris per halaman</span>
            <Select value={String(pageSize)} onValueChange={(v) => { if (v) setPageSize(Number(v)); setPage(1) }}>
              <SelectTrigger className="h-8 w-[65px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span>Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG FORM TAMBAH / EDIT PENGGUNA */}
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

            {/* KELAS: hanya muncul untuk peran Siswa */}
            {formUser.role === "SISWA" &&
              (editingUser && lihatTahunLain ? (
                <p className="rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                  Kelas tidak diubah dari sini karena tabel sedang menampilkan tahun ajaran {kelasTahun}.
                  Gunakan Pindah / Naik Kelas, atau kembali ke tahun ajaran aktif ({tahunAktif || "belum ada"}).
                </p>
              ) : (
                <div className="space-y-1.5">
                  <Label>Kelas{tahunAktif ? ` (Tahun Ajaran ${tahunAktif})` : ""}</Label>
                  <Select
                    value={formUser.kelasId || NO_KELAS}
                    disabled={!tahunAktif}
                    onValueChange={(v) => {
                      if (v) setFormUser({ ...formUser, kelasId: v === NO_KELAS ? "" : v })
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{kelasTerpilih?.namaKelas ?? "Belum ada kelas"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_KELAS}>Belum ada kelas</SelectItem>
                      {kelasOptions.map((k) => (
                        <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {tahunAktif
                      ? "Kelas ini menentukan ujian mana yang bisa diikuti siswa. Siswa tanpa kelas tidak bisa mengikuti ujian."
                      : "Belum ada tahun ajaran aktif. Aktifkan satu periode di Master Data > Tahun Ajaran agar kelas bisa dipilih."}
                  </p>
                </div>
              ))}

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

      {/* DIALOG PINDAH / NAIK KELAS MASSAL */}
      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          // Dialog tidak bisa ditutup selagi proses berjalan
          if (!open && !bulkMutation.isPending) setBulkOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" /> Pindah / Naik Kelas
            </DialogTitle>
            <DialogDescription>
              {selected.size} siswa dipilih. Tentukan kelas tujuan untuk tiap kelas asal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 text-sm">
            {/* Tahun ajaran tujuan */}
            <div className="space-y-1.5">
              <Label>Tahun ajaran tujuan</Label>
              <Select
                value={bulkTahun}
                disabled={bulkMutation.isPending}
                onValueChange={(v) => { if (v) handleBulkTahunChange(v) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{bulkTahun || "Pilih tahun ajaran"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tahunTujuanOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                      {t === tahunTampil ? " (tahun yang sedang ditampilkan)" : ""}
                      {t === tahunBerikut && !tahunMaster.includes(t) ? " (belum ada di master)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {bulkSameYear
                  ? `Siswa dipindahkan dalam tahun ajaran ${bulkTahun}. Kelas lamanya di tahun ini diganti.`
                  : `Siswa dikelaskan ulang di tahun ajaran ${bulkTahun || "tujuan"}. Kelas tahun ${tahunTampil || "sebelumnya"} tetap tersimpan sebagai riwayat.`}
              </p>
            </div>

            {/* Satu baris per kelas asal */}
            <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
              {bulkGroups.map((group) => {
                const target = bulkTargets[group.key] ?? TARGET_SKIP
                const ikut = group.users.filter((u) => !bulkExcluded.has(u.id)).length
                const expanded = bulkExpanded.has(group.key)

                return (
                  <div key={group.key} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{group.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          {ikut} dari {group.users.length} siswa ikut diproses
                        </p>
                      </div>

                      <Select
                        value={target}
                        disabled={bulkMutation.isPending}
                        onValueChange={(v) => {
                          if (v) setBulkTargets((prev) => ({ ...prev, [group.key]: v }))
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue>{targetLabel(target)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TARGET_SKIP}>Tidak diubah</SelectItem>
                          {kelasAktif.map((k) => (
                            <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
                          ))}
                          {bulkSameYear && group.key !== KEY_NONE && (
                            <SelectItem value={TARGET_REMOVE}>Cabut dari kelas</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => toggleExpanded(group.key)}
                    >
                      {expanded ? "Sembunyikan siswa" : "Lihat siswa (kecualikan jika perlu)"}
                    </button>

                    {expanded && (
                      <div className="grid max-h-[160px] grid-cols-1 gap-1.5 overflow-y-auto rounded-md bg-muted/30 p-2">
                        {group.users.map((u) => (
                          <label
                            key={u.id}
                            className="flex cursor-pointer items-center gap-2 text-xs"
                          >
                            <Checkbox
                              checked={!bulkExcluded.has(u.id)}
                              onCheckedChange={() => toggleExcluded(u.id)}
                            />
                            <span className="flex-1 truncate">{u.nama}</span>
                            <span className="font-mono text-muted-foreground">{u.nipNisn}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Ringkasan */}
            <div className="rounded-md bg-muted/40 p-2.5 text-xs">
              <span className="font-medium text-emerald-600">{bulkSummary.moved} dikelaskan</span>
              {bulkSummary.removed > 0 && (
                <span className="font-medium text-destructive"> · {bulkSummary.removed} dicabut dari kelas</span>
              )}
              <span className="text-muted-foreground"> · {bulkSummary.skipped} dilewati</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkOpen(false)}
              disabled={bulkMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={handleApplyBulk}
              disabled={
                bulkMutation.isPending ||
                !bulkTahun ||
                bulkSummary.moved + bulkSummary.removed === 0
              }
            >
              {bulkMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
              ) : (
                "Terapkan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}