'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface RoleData {
  id: string
  code: string
  name: string
  description: string
  total_user: number
  status: 'Aktif' | 'Nonaktif'
}

export async function getRoles() {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from('mst_role')
    .select('id, code, name, description, total_user, status')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { data: data as RoleData[] }
}

export async function createRole(payload: {
  namaRole: string
  deskripsi: string
  status?: 'Aktif' | 'Nonaktif'
}) {
  const supabaseAdmin = createAdminClient()

  const code = payload.namaRole
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')

  const { data, error } = await supabaseAdmin
    .from('mst_role')
    .insert([
      {
        code: code,
        name: payload.namaRole,
        description: payload.deskripsi,
        status: payload.status || 'Aktif',
      },
    ])
    .select()

  if (error) return { error: error.message }

  revalidatePath('/pengaturan/hak-akses')
  return { success: true, data }
}

export async function updateRole(
  id: string,
  payload: {
    namaRole: string
    deskripsi: string
    status: 'Aktif' | 'Nonaktif'
  }
) {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from('mst_role')
    .update({
      name: payload.namaRole,
      description: payload.deskripsi,
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()

  if (error) return { error: error.message }

  revalidatePath('/pengaturan/hak-akses')
  return { success: true, data }
}