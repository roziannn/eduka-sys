import { query, queryOne } from "@/lib/db"

export type TokenState = {
  id: string
  token: string
  is_open: boolean
  opened_at: Date | null
  closed_at: Date | null
  status: string // status ujian: "Draft" | "Siap Ujian"
}

export const tokenUjianRepository = {
  findState(ujianId: string) {
    return queryOne<TokenState>(
      `SELECT t.id, t.token, t.is_open, t.opened_at, t.closed_at, s.status
       FROM "MST_TokenUjian" t
       JOIN "MST_SoalUjian" s ON s.id = t.soal_ujian_id
       WHERE t.soal_ujian_id = $1 AND t.is_active`,
      [ujianId]
    )
  },

  async setOpen(ujianId: string, open: boolean, userId: string) {
    const rows = await query<{ id: string }>(
      `UPDATE "MST_TokenUjian"
       SET is_open    = $2::boolean,
           opened_at  = CASE WHEN $2::boolean THEN NOW() ELSE opened_at END,
           closed_at  = CASE WHEN $2::boolean THEN NULL ELSE NOW() END,
           updated_by = $3,
           updated_at = NOW()
       WHERE soal_ujian_id = $1 AND is_active
       RETURNING id`,
      [ujianId, open, userId]
    )
    return rows.length > 0
  },
}