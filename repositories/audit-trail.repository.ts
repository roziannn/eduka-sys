import { query } from "@/lib/db"

export type AuditTrailInput = {
  userId: string | null
  userName: string
  activity: string
  note: string | null
}

export type AuditTrailRecord = {
  id: string
  user_name: string
  activity: string
  note: string | null
  created_at: Date
}

export const auditTrailRepository = {
  async create(input: AuditTrailInput) {
    await query(
      `INSERT INTO "CORE_AuditTrail" (user_id, user_name, activity, note)
       VALUES ($1, $2, $3, $4)`,
      [input.userId, input.userName, input.activity, input.note]
    )
  },

  // Terbaru dulu. Kata kunci mencari di nama, aktivitas, dan catatan.
  async findPage(search: string, limit: number, offset: number) {
    const like = `%${search.replace(/[%_\\]/g, "\\$&")}%`
    const rows = await query<AuditTrailRecord & { total: number }>(
      `SELECT id::text, user_name, activity, note, created_at,
              COUNT(*) OVER()::int AS total
       FROM "CORE_AuditTrail"
       WHERE $1 = '' OR user_name ILIKE $2 OR activity ILIKE $2 OR note ILIKE $2
       ORDER BY created_at DESC, id DESC
       LIMIT $3 OFFSET $4`,
      [search, like, limit, offset]
    )
    return { rows, total: rows[0]?.total ?? 0 }
  },
}
