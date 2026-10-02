import bcrypt from "bcryptjs"
import { ApiError } from "@/lib/api"
import { userRepository, type UserRecord } from "@/repositories/user.repository"
import { roleRepository } from "@/repositories/role.repository"

type UiRole = "ADMINISTRATOR" | "GURU" | "SISWA"
type UiStatus = "Aktif" | "Nonaktif"

export type UserPayload = {
  nama: string
  email: string
  nipNisn: string
  role: string
  status: string
}

const DEFAULT_PASSWORD = "eduka123"

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

function formatUser(u: UserRecord) {
  return {
    id: u.id,
    nama: u.full_name || u.username || u.email.split("@")[0],
    email: u.email,
    nipNisn: u.nip_nisn || "-",
    role: ROLE_TO_UI[u.role_normalized] ?? ("GURU" as UiRole),
    status: (u.is_active ? "Aktif" : "Nonaktif") as UiStatus,
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

async function resolveRoleId(role: string): Promise<string> {
  const normalized = ROLE_TO_DB[role]
  if (!normalized) throw new ApiError(400, "Role tidak valid")

  const roleId = await roleRepository.findIdByNormalizedName(normalized)
  if (!roleId) throw new ApiError(500, "Role tidak ditemukan di database")
  return roleId
}

function validateBasic(payload: UserPayload) {
  const email = (payload.email ?? "").trim()
  const nama = (payload.nama ?? "").trim()
  if (!email || !nama) throw new ApiError(400, "Nama dan email wajib diisi")
  return { email, nama }
}

export const userService = {
  async list() {
    const users = await userRepository.findAll()
    return users.map(formatUser)
  },

  async create(payload: UserPayload & { password?: string }) {
    const { email, nama } = validateBasic(payload)
    const roleId = await resolveRoleId(payload.role)
    const passwordHash = await bcrypt.hash(
      payload.password || DEFAULT_PASSWORD,
      10
    )

    const id = await userRepository.create({
      roleId,
      username: email.split("@")[0],
      email,
      fullName: nama,
      nipNisn: cleanNipNisn(payload.nipNisn),
      passwordHash,
      isActive: payload.status !== "Nonaktif",
    })

    return { id }
  },

  async update(userId: string, payload: UserPayload) {
    const { email, nama } = validateBasic(payload)
    const roleId = await resolveRoleId(payload.role)

    const updated = await userRepository.update(userId, {
      roleId,
      email,
      fullName: nama,
      nipNisn: cleanNipNisn(payload.nipNisn),
      isActive: payload.status !== "Nonaktif",
    })
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
}