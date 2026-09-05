'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Inisialisasi Supabase Admin Client khusus menggunakan Service Role Key
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function getUsers() {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) return { error: error.message }

  const formattedUsers = data.users.map((u) => ({
    id: u.id,
    nama: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
    email: u.email || '',
    nipNisn: u.user_metadata?.nip_nisn || '-',
    role: (u.user_metadata?.role as 'ADMINISTRATOR' | 'GURU' | 'SISWA') || 'GURU',
    status: (u.user_metadata?.status as 'Aktif' | 'Nonaktif') || 'Aktif',
    lastLogin: u.last_sign_in_at
      ? new Date(u.last_sign_in_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Belum pernah',
  }))

  return { data: formattedUsers }
}

export async function createNewUser(payload: {
  nama: string
  email: string
  nipNisn: string
  role: string
  status: string
  password?: string
}) {
  const supabaseAdmin = createAdminClient()

  // Pakai Admin API (tidak terkena rate limit email & melewati proteksi anon)
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password || 'eduka123',
    email_confirm: true,
    user_metadata: {
      full_name: payload.nama,
      nip_nisn: payload.nipNisn,
      role: payload.role,
      status: payload.status,
    },
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/pengaturan/akun-pengguna')
  return { success: true, data }
}

export async function fetchUsersFromSupabase() {
  const supabase = await createClient()
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    const { data: { user } } = await supabase.auth.getUser()
    return user ? [user] : []
  }

  return users
}

export async function updateUser(userId: string, payload: {
  nama: string
  email: string
  nipNisn: string
  role: string
  status: string
}) {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: payload.email,
    user_metadata: {
      full_name: payload.nama,
      nip_nisn: payload.nipNisn,
      role: payload.role,
      status: payload.status,
    },
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/pengaturan/akun-pengguna')
  return { success: true, data }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/pengaturan/akun-pengguna')
  return { success: true, data }
}