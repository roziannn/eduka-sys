'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { queryOne, query } from '@/lib/db'
import { createSession, destroySession } from '@/lib/auth'
import { roleAccessService } from '@/services/role-access.service'
import { landingUrl } from '@/lib/access'
import type { SessionAccess } from '@/lib/auth'

type UserRow = {
  id: string
  role_id: string
  email: string
  password_hash: string
  is_active: boolean
  role_name: string
  role_normalized: string
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Guru',
  STUDENT: 'Siswa',
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const selectedRole = String(formData.get('role') ?? '').trim().toUpperCase()

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' }
  }

  const user = await queryOne<UserRow>(
    `SELECT u.id, u.role_id, u.email, u.password_hash, u.is_active,
            r.name AS role_name, r.normalized_name AS role_normalized
     FROM "CORE_User" u
     JOIN "CORE_Role" r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  )

  if (!user) {
    return { error: 'Email atau password salah' }
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash)
  if (!passwordValid) {
    return { error: 'Email atau password salah' }
  }

  if (!user.is_active) {
    return { error: 'Akun tidak aktif, hubungi administrator' }
  }

  if (selectedRole && user.role_normalized !== selectedRole) {
    const label = ROLE_LABEL[selectedRole] ?? selectedRole
    return { error: `Akun ini tidak terdaftar sebagai ${label}` }
  }

  await query(
    `UPDATE "CORE_User" SET last_login_at = NOW() WHERE id = $1`,
    [user.id]
  )

  let access: SessionAccess
  try {
    // Daftar menu dan button yang boleh dipakai ikut disimpan di sesi
    access = await roleAccessService.forSession(user.role_id)

    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role_normalized,
      access,
    })
  } catch (err) {
    console.error(err)
    return { error: 'Gagal memuat hak akses, hubungi administrator' }
  }

  revalidatePath('/', 'layout')
  redirect(landingUrl(access))
}

export async function logout() {
  await destroySession()

  revalidatePath('/', 'layout')
  redirect('/login')
}