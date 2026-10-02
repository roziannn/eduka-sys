import { cache } from "react"
import { getSession } from "@/lib/auth"
import { queryOne } from "@/lib/db"

export type CurrentUser = {
  id: string
  name: string
  email: string
  avatar: string
  role: string
}

type Row = {
  id: string
  username: string
  email: string
  full_name: string | null
  is_active: boolean
  role: string
}

// cache() supaya dalam satu request query-nya hanya jalan sekali,
// walaupun dipanggil dari layout dan page sekaligus
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession()
  if (!session) return null

  const row = await queryOne<Row>(
    `SELECT u.id, u.username, u.email, u.full_name, u.is_active,
            r.normalized_name AS role
     FROM "CORE_User" u
     JOIN "CORE_Role" r ON r.id = u.role_id
     WHERE u.id = $1`,
    [session.userId]
  )

  if (!row || !row.is_active) return null

  return {
    id: row.id,
    name: row.full_name || row.username || row.email.split("@")[0],
    email: row.email,
    avatar: "/avatars/admin.jpg", // belum ada kolom avatar di CORE_User
    role: row.role,
  }
})