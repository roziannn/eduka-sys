import { query, queryOne } from "@/lib/db"
import type { TemplateContent } from "@/types/rapor-template"

export type TemplateRaporListRecord = {
  id: string
  nama: string
  jenis: string
  is_active: boolean
  paper_size: string | null
  jumlah_elemen: number
  created_at: Date
  updated_at: Date
  created_by_name: string | null
}

export type TemplateRaporRecord = TemplateRaporListRecord & {
  konten: TemplateContent
}

export type TemplateRaporInput = {
  nama: string
  jenis: string
  konten: TemplateContent
}

const LIST_COLUMNS = `
  t.id, t.nama, t.jenis, t.is_active,
  t.konten -> 'page' ->> 'size' AS paper_size,
  jsonb_array_length(t.konten -> 'elements') AS jumlah_elemen,
  t.created_at, t.updated_at,
  COALESCE(u.full_name, u.username) AS created_by_name
`

const FROM_JOINED = `
  FROM "MST_TemplateRapor" t
  LEFT JOIN "CORE_User" u ON u.id = t.created_by
`

export const templateRaporRepository = {
  // List tidak membawa kolom konten supaya ringan
  findAll() {
    return query<TemplateRaporListRecord>(
      `SELECT ${LIST_COLUMNS} ${FROM_JOINED} ORDER BY t.updated_at DESC`
    )
  },

  findById(id: string) {
    return queryOne<TemplateRaporRecord>(
      `SELECT ${LIST_COLUMNS}, t.konten ${FROM_JOINED} WHERE t.id = $1`,
      [id]
    )
  },

  async create(input: TemplateRaporInput, userId: string) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO "MST_TemplateRapor"
         (nama, jenis, konten, created_by, updated_by)
       VALUES ($1, $2, $3::jsonb, $4, $4)
       RETURNING id`,
      [input.nama, input.jenis, JSON.stringify(input.konten), userId]
    )
    return row!.id
  },

  // false kalau data tidak ditemukan
  async update(id: string, input: TemplateRaporInput, userId: string) {
    const row = await queryOne<{ id: string }>(
      `UPDATE "MST_TemplateRapor"
       SET nama = $2, jenis = $3, konten = $4::jsonb,
           updated_by = $5, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, input.nama, input.jenis, JSON.stringify(input.konten), userId]
    )
    return row !== null
  },
}