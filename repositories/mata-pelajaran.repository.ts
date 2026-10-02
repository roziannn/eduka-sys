import { query, queryOne } from "@/lib/db"

export type MataPelajaranRecord = {
  id: string
  kode: string
  nama: string
  kategori: string
  is_active: boolean
  created_at: Date
  created_by_name: string | null
}

export type MataPelajaranInput = {
  kode: string
  nama: string
  kategori: string
  isActive: boolean
}

export const mataPelajaranRepository = {
  findAll() {
    return query<MataPelajaranRecord>(
      `SELECT m.id, m.kode, m.nama, m.kategori, m.is_active, m.created_at,
              COALESCE(u.full_name, u.username) AS created_by_name
       FROM "MST_MataPelajaran" m
       LEFT JOIN "CORE_User" u ON u.id = m.created_by
       ORDER BY m.kode`
    )
  },

  async create(input: MataPelajaranInput, userId: string) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO "MST_MataPelajaran"
         (kode, nama, kategori, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING id`,
      [input.kode, input.nama, input.kategori, input.isActive, userId]
    )
    return row!.id
  },

  async update(id: string, input: MataPelajaranInput, userId: string) {
    const row = await queryOne<{ id: string }>(
      `UPDATE "MST_MataPelajaran"
       SET kode = $2, nama = $3, kategori = $4, is_active = $5,
           updated_by = $6, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, input.kode, input.nama, input.kategori, input.isActive, userId]
    )
    return row !== null
  },
}