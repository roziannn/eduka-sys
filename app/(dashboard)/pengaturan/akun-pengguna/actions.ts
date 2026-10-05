'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/current-user'
import { userRepository, type UserRecord } from '@/repositories/user.repository'
import { roleRepository } from '@/repositories/role.repository'

type UiRole = 'ADMINISTRATOR' | 'GURU' | 'SISWA'
type UiStatus = 'Aktif' | 'Nonaktif'

const USERS_PATH = '/pengaturan/akun-pengguna'
const DEFAULT_PASSWORD = 'eduka123'

const ROLE_TO_DB: Record<string, string> = {
  ADMINISTRATOR: 'ADMIN',
  GURU: 'TEACHER',
  SISWA: 'STUDENT',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
}

// database -> UI
const ROLE_TO_UI: Record<string, UiRole> = {
  ADMIN: 'ADMINISTRATOR',
  TEACHER: 'GURU',
  STUDENT: 'SISWA',
}

async function requireAdmin() {
  const user = await getCurrentUser()
  return user && user.role === 'ADMIN' ? user : null
}

function toErrorMessage(err: unknown): string {
  const e = err as { code?: string; constraint?: string }
  if (e?.code === '23505') {
    if (e.constraint?.includes('email')) return 'Email sudah terdaftar'
    if (e.constraint?.includes('username')) return 'Username sudah dipakai'
    return 'Data sudah ada'
  }
  console.error(err)
  return 'Terjadi kesalahan pada server'
}

function formatUser(u: UserRecord) {
  return {
    id: u.id,
    nama: u.full_name || u.username || u.email.split('@')[0],
    email: u.email,
    nipNisn: u.nip_nisn || '-',
    role: ROLE_TO_UI[u.role_normalized] ?? ('GURU' as UiRole),
    status: (u.is_active ? 'Aktif' : 'Nonaktif') as UiStatus,
    lastLogin: u.last_login_at
      ? new Date(u.last_login_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Belum pernah',
  }
}

function cleanNipNisn(value: string | undefined): string | null {
  const v = (value ?? '').trim()
  return v === '' || v === '-' ? null : v
}

export async function getUsers() {
  if (!(await requireAdmin())) return { error: 'Anda tidak memiliki akses' }

  try {
    const users = await userRepository.findAll()
    return { data: users.map(formatUser) }
  } catch (err) {
    return { error: toErrorMessage(err) }
  }
}

export async function createNewUser(payload: {
  nama: string
  email: string
  nipNisn: string
  role: string
  status: string
  password?: string
}) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Anda tidak memiliki akses' }

  const email = payload.email.trim()
  const nama = payload.nama.trim()
  if (!email || !nama) return { error: 'Nama dan email wajib diisi' }

  const roleNormalized = ROLE_TO_DB[payload.role]
  if (!roleNormalized) return { error: 'Role tidak valid' }

  try {
    const roleId = await roleRepository.findIdByNormalizedName(roleNormalized)
    if (!roleId) return { error: 'Role tidak ditemukan di database' }

    const passwordHash = await bcrypt.hash(payload.password || DEFAULT_PASSWORD, 10)

    // Tanpa penempatan kelas: halaman ini tidak mengatur kelas
    const id = await userRepository.create(
      {
        roleId,
        username: email.split('@')[0],
        email,
        fullName: nama,
        nipNisn: cleanNipNisn(payload.nipNisn),
        passwordHash,
        isActive: payload.status !== 'Nonaktif',
      },
      null,
      admin.id
    )

    revalidatePath(USERS_PATH)
    return { success: true, data: { id } }
  } catch (err) {
    return { error: toErrorMessage(err) }
  }
}

export async function updateUser(
  userId: string,
  payload: {
    nama: string
    email: string
    nipNisn: string
    role: string
    status: string
  }
) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Anda tidak memiliki akses' }

  const email = payload.email.trim()
  const nama = payload.nama.trim()
  if (!email || !nama) return { error: 'Nama dan email wajib diisi' }

  const roleNormalized = ROLE_TO_DB[payload.role]
  if (!roleNormalized) return { error: 'Role tidak valid' }

  try {
    const roleId = await roleRepository.findIdByNormalizedName(roleNormalized)
    if (!roleId) return { error: 'Role tidak ditemukan di database' }

    // placement null = penempatan kelas tidak diubah
    const updated = await userRepository.update(
      userId,
      {
        roleId,
        email,
        fullName: nama,
        nipNisn: cleanNipNisn(payload.nipNisn),
        isActive: payload.status !== 'Nonaktif',
      },
      null,
      admin.id
    )
    if (!updated) return { error: 'Pengguna tidak ditemukan' }

    revalidatePath(USERS_PATH)
    return { success: true }
  } catch (err) {
    return { error: toErrorMessage(err) }
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  if (!(await requireAdmin())) return { error: 'Anda tidak memiliki akses' }

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password minimal 6 karakter' }
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10)
    const updated = await userRepository.updatePassword(userId, passwordHash)
    if (!updated) return { error: 'Pengguna tidak ditemukan' }

    revalidatePath(USERS_PATH)
    return { success: true }
  } catch (err) {
    return { error: toErrorMessage(err) }
  }
}