import bcrypt from "bcryptjs"
import { ApiError } from "@/lib/api"
import {
  userRepository,
  type KelasPlacement,
  type UserListRecord,
} from "@/repositories/user.repository"
import { roleRepository } from "@/repositories/role.repository"

type UiRole = "ADMINISTRATOR" | "GURU" | "SISWA"
type UiStatus = "Aktif" | "Nonaktif"

export type UserPayload = {
  nama: string
  email: string
  nipNisn: string
  role: string
  status: string
  // undefined = kelas tidak diubah, null = tanpa kelas, string = id kelas
  kelasId?: string | null
}

export type BulkKelasPayload = {
  tahunAjaran: string
  assignments: unknown
}

const DEFAULT_PASSWORD = "eduka123"
const MAX_BULK = 1000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// UI -> database (terima dua bentuk supaya aman)
const ROLE_TO_DB: Record<string, string> = {
  ADMINISTRATOR: "ADMIN",
  GURU: "TEACHER",
  SISWA: "STUDENT",
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
}

// database -> UI
const ROLE_TO_UI: Record<string, UiRole> = {
  ADMIN: "ADMINISTRATOR",
  TEACHER: "GURU",
  STUDENT: "SISWA",
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

function formatUser(u: UserListRecord) {
  return {
    id: u.id,
    nama: u.full_name || u.username || u.email.split("@")[0],
    email: u.email,
    nipNisn: u.nip_nisn || "-",
    role: ROLE_TO_UI[u.role_normalized] ?? ("GURU" as UiRole),
    status: (u.is_active ? "Aktif" : "Nonaktif") as UiStatus,
    kelasId: u.kelas_id,
    kelas: u.kelas_nama,
    lastLogin: u.last_login_at
      ? new Date(u.last_login_at).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Belum pernah",
  }
}

function cleanNipNisn(value: string | undefined): string | null {
  const v = (value ?? "").trim()
  return v === "" || v === "-" ? null : v
}

// Format 2026/2027, dan tahun akhir harus tahun awal + 1
function parseTahunAjaran(value: unknown): string {
  const tahun = typeof value === "string" ? value.trim() : ""
  const m = /^(\d{4})\/(\d{4})$/.exec(tahun)
  if (!m || Number(m[2]) !== Number(m[1]) + 1) {
    throw new ApiError(400, "Format tahun ajaran harus seperti 2026/2027")
  }
  return tahun
}

async function resolveRole(role: string) {
  const normalized = ROLE_TO_DB[role]
  if (!normalized) throw new ApiError(400, "Role tidak valid")

  const roleId = await roleRepository.findIdByNormalizedName(normalized)
  if (!roleId) throw new ApiError(500, "Role tidak ditemukan di database")
  return { roleId, normalized }
}

function validateBasic(payload: UserPayload) {
  const email = (payload.email ?? "").trim()
  const nama = (payload.nama ?? "").trim()
  if (!email || !nama) throw new ApiError(400, "Nama dan email wajib diisi")
  return { email, nama }
}

// Menentukan perubahan kelas pada tahun ajaran aktif. null = tidak ada yang perlu disentuh.
// - Bukan siswa: saat edit, kelas lama dicabut.
// - Siswa dan kelasId tidak dikirim (undefined): kelas tidak diubah.
// - Siswa dengan kelas: pasang atau pindahkan.
// - Siswa tanpa kelas: saat edit, kelas lama dicabut. Saat buat akun, tidak ada yang dilakukan.
async function buildPlacement(
  roleNormalized: string,
  kelasIdRaw: unknown,
  isCreate: boolean
): Promise<KelasPlacement | null> {
  const tahunAjaran = await userRepository.findActiveTahunAjaran()

  if (roleNormalized !== "STUDENT") {
    return !isCreate && tahunAjaran ? { tahunAjaran, kelasId: null } : null
  }

  if (kelasIdRaw === undefined) return null

  const kelasId =
    typeof kelasIdRaw === "string" && kelasIdRaw.trim() ? kelasIdRaw.trim() : null

  if (kelasId === null) {
    return !isCreate && tahunAjaran ? { tahunAjaran, kelasId: null } : null
  }

  if (!UUID_RE.test(kelasId)) throw new ApiError(400, "Kelas tidak valid")
  if (!tahunAjaran) {
    throw new ApiError(
      400,
      "Belum ada tahun ajaran aktif. Aktifkan satu periode di Master Data > Tahun Ajaran dulu."
    )
  }
  if (!(await userRepository.kelasExists(kelasId))) {
    throw new ApiError(400, "Kelas tidak ditemukan")
  }

  return { tahunAjaran, kelasId }
}

export const userService = {
  // tahunAjaran: kelas siswa yang ditampilkan. Kosong = tahun ajaran yang sedang aktif.
  async list(tahunAjaran: string | null = null) {
    const tahun = tahunAjaran ? parseTahunAjaran(tahunAjaran) : null
    const users = await userRepository.findAll(tahun)
    return users.map(formatUser)
  },

  async create(payload: UserPayload & { password?: string }, actorId: string) {
    const { email, nama } = validateBasic(payload)
    const { roleId, normalized } = await resolveRole(payload.role)
    const placement = await buildPlacement(normalized, payload.kelasId, true)

    const passwordHash = await bcrypt.hash(payload.password || DEFAULT_PASSWORD, 10)

    const id = await userRepository.create(
      {
        roleId,
        username: email.split("@")[0],
        email,
        fullName: nama,
        nipNisn: cleanNipNisn(payload.nipNisn),
        passwordHash,
        isActive: payload.status !== "Nonaktif",
      },
      placement,
      actorId
    )

    return { id }
  },

  async update(userId: string, payload: UserPayload, actorId: string) {
    const { email, nama } = validateBasic(payload)
    const { roleId, normalized } = await resolveRole(payload.role)
    const placement = await buildPlacement(normalized, payload.kelasId, false)

    const updated = await userRepository.update(
      userId,
      {
        roleId,
        email,
        fullName: nama,
        nipNisn: cleanNipNisn(payload.nipNisn),
        isActive: payload.status !== "Nonaktif",
      },
      placement,
      actorId
    )
    if (!updated) throw new ApiError(404, "Pengguna tidak ditemukan")
  },

  async resetPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, "Password minimal 6 karakter")
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    const updated = await userRepository.updatePassword(userId, passwordHash)
    if (!updated) throw new ApiError(404, "Pengguna tidak ditemukan")
  },

  // Pindah / naik kelas massal. assignments: [{ userId, kelasId }], kelasId null = cabut kelas
  // pada tahun ajaran tujuan. Tahun ajaran tujuan tidak harus sudah ada di master (naik kelas
  // biasanya dikerjakan sebelum periode baru dibuat).
  async bulkKelas(payload: BulkKelasPayload, actorId: string) {
    const tahunAjaran = parseTahunAjaran(payload.tahunAjaran)

    if (!Array.isArray(payload.assignments) || payload.assignments.length === 0) {
      throw new ApiError(400, "Pilih minimal 1 siswa")
    }
    if (payload.assignments.length > MAX_BULK) {
      throw new ApiError(400, `Maksimal ${MAX_BULK} siswa per proses`)
    }

    const seen = new Set<string>()
    const moves: { userId: string; kelasId: string }[] = []
    const removeUserIds: string[] = []

    for (const item of payload.assignments as unknown[]) {
      if (!isPlainObject(item)) throw new ApiError(400, "Data siswa tidak valid")

      const userId = typeof item.userId === "string" ? item.userId : ""
      if (!UUID_RE.test(userId)) throw new ApiError(400, "ID siswa tidak valid")
      if (seen.has(userId)) throw new ApiError(400, "Ada siswa yang terpilih dua kali")
      seen.add(userId)

      if (item.kelasId === null) {
        removeUserIds.push(userId)
        continue
      }

      const kelasId = typeof item.kelasId === "string" ? item.kelasId : ""
      if (!UUID_RE.test(kelasId)) throw new ApiError(400, "Kelas tujuan tidak valid")
      moves.push({ userId, kelasId })
    }

    // Semua akun harus siswa
    if ((await userRepository.countStudents(Array.from(seen))) !== seen.size) {
      throw new ApiError(400, "Sebagian akun yang dipilih bukan siswa atau tidak ditemukan")
    }

    // Semua kelas tujuan harus ada
    const kelasIds = Array.from(new Set(moves.map((m) => m.kelasId)))
    if (kelasIds.length > 0 && (await userRepository.countKelas(kelasIds)) !== kelasIds.length) {
      throw new ApiError(400, "Sebagian kelas tujuan tidak ditemukan")
    }

    return userRepository.bulkAssignKelas(tahunAjaran, moves, removeUserIds, actorId)
  },
}