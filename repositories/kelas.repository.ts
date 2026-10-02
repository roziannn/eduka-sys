import { query, queryOne } from "@/lib/db"

export type KelasRecord = {
  id: string
  nama_kelas: string
  tingkat: string
  jurusan: string | null
  kapasitas: number
  is_active: boolean
  created_at: Date
  created_by_name: string | null
}

export type KelasInput = {
  namaKelas: string
  tingkat: string
  jurusan: string | null
  kapasitas: number
  isActive: boolean
}

export const kelasRepository = {
  findAll() {
    return query<KelasRecord>(
      `SELECT k.id, k.nama_kelas, k.tingkat, k.jurusan, k.kapasitas,
              k.is_active, k.created_at,
              COALESCE(u.full_name, u.username) AS created_by_name
       FROM "MST_Kelas" k
       LEFT JOIN "CORE_User" u ON u.id = k.created_by
       ORDER BY k.tingkat, k.nama_kelas`
    )
  },

  async create(input: KelasInput, userId: string) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO "MST_Kelas"
         (nama_kelas, tingkat, jurusan, kapasitas, is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING id`,
      [
        input.namaKelas,
        input.tingkat,
        input.jurusan,
        input.kapasitas,
        input.isActive,
        userId,
      ]
    )
    return row!.id
  },

  async update(id: string, input: KelasInput, userId: string) {
    const row = await queryOne<{ id: string }>(
      `UPDATE "MST_Kelas"
       SET nama_kelas = $2, tingkat = $3, jurusan = $4, kapasitas = $5,
           is_active = $6, updated_by = $7, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        input.namaKelas,
        input.tingkat,
        input.jurusan,
        input.kapasitas,
        input.isActive,
        userId,
      ]
    )
    return row !== null
  },
}