import { query, queryOne, withTransaction } from "@/lib/db"

export type TahunAjaranRecord = {
  id: string
  tahun_ajaran: string
  semester: string
  is_active: boolean
  created_at: Date
  created_by_name: string | null
}

export type TahunAjaranInput = {
  tahunAjaran: string
  semester: string
  isActive: boolean
}

const SELECT_TAHUN_AJARAN = `
  SELECT t.id, t.tahun_ajaran, t.semester, t.is_active, t.created_at,
         COALESCE(u.full_name, u.username) AS created_by_name
  FROM "MST_TahunAjaran" t
  LEFT JOIN "CORE_User" u ON u.id = t.created_by
`

const DEACTIVATE_OTHERS = `
  UPDATE "MST_TahunAjaran"
  SET is_active = FALSE, updated_by = $1, updated_at = NOW()
  WHERE is_active = TRUE AND id <> $2
`

export const tahunAjaranRepository = {
  findAll() {
    return query<TahunAjaranRecord>(
      `${SELECT_TAHUN_AJARAN}
       ORDER BY t.tahun_ajaran DESC, t.semester DESC`
    )
  },

  findById(id: string) {
    return queryOne<TahunAjaranRecord>(`${SELECT_TAHUN_AJARAN} WHERE t.id = $1`, [id])
  },

  create(input: TahunAjaranInput, userId: string) {
    return withTransaction(async (client) => {
      if (input.isActive) {
        await client.query(DEACTIVATE_OTHERS, [
          userId,
          "00000000-0000-0000-0000-000000000000",
        ])
      }

      const res = await client.query<{ id: string }>(
        `INSERT INTO "MST_TahunAjaran"
           (tahun_ajaran, semester, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        [input.tahunAjaran, input.semester, input.isActive, userId]
      )
      return res.rows[0].id
    })
  },

  // false kalau data tidak ditemukan
  update(id: string, input: TahunAjaranInput, userId: string) {
    return withTransaction(async (client) => {
      const exists = await client.query(
        `SELECT 1 FROM "MST_TahunAjaran" WHERE id = $1 FOR UPDATE`,
        [id]
      )
      if (exists.rowCount === 0) return false

      if (input.isActive) {
        await client.query(DEACTIVATE_OTHERS, [userId, id])
      }

      await client.query(
        `UPDATE "MST_TahunAjaran"
         SET tahun_ajaran = $2, semester = $3, is_active = $4,
             updated_by = $5, updated_at = NOW()
         WHERE id = $1`,
        [id, input.tahunAjaran, input.semester, input.isActive, userId]
      )
      return true
    })
  },
}