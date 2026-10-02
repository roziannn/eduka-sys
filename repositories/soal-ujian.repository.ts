import type { PoolClient } from "pg"
import { query, queryOne, withTransaction } from "@/lib/db"
import type { UjianDataJson } from "@/types/soal-ujian"

export type SoalUjianListRecord = {
  id: string
  nama: string
  jenis: string
  status: string
  durasi_menit: number
  nilai_kkm: number
  created_at: Date
  updated_at: Date
  mapel_nama: string
  tahun_ajaran: string
  semester: string
  jumlah_soal: number
  total_bobot: number
  kelas: string[]
  created_by_name: string | null
}

export type SoalUjianDetailRecord = {
  id: string
  nama: string
  mapel_id: string
  jenis: string
  status: string
  durasi_menit: number
  nilai_kkm: number
  acak_soal: boolean
  tampilkan_hasil: boolean
  data_json: UjianDataJson
  tahun_ajaran: string
  semester: string
  kelas_ids: string[]
}

export type SoalUjianInput = {
  nama: string
  mapelId: string
  jenis: string
  tahunAjaranId: string
  durasiMenit: number
  kkm: number
  acakSoal: boolean
  tampilkanHasil: boolean
  status: string
  dataJson: UjianDataJson
  kelasIds: string[]
}

// Samakan distribusi kelas dengan daftar baru: hapus yang tidak dipilih lagi, tambah yang baru.
// Baris yang sudah ada dibiarkan, supaya created_by / created_at aslinya tetap.
async function syncKelas(
  client: PoolClient,
  ujianId: string,
  kelasIds: string[],
  userId: string
) {
  await client.query(
    `DELETE FROM "MST_SoalUjianKelas"
     WHERE soal_ujian_id = $1 AND kelas_id <> ALL($2::uuid[])`,
    [ujianId, kelasIds]
  )

  if (kelasIds.length > 0) {
    await client.query(
      `INSERT INTO "MST_SoalUjianKelas" (soal_ujian_id, kelas_id, created_by, updated_by)
       SELECT $1::uuid, k, $3::uuid, $3::uuid FROM unnest($2::uuid[]) AS k
       ON CONFLICT DO NOTHING`,
      [ujianId, kelasIds, userId]
    )
  }
}

export const soalUjianRepository = {
  async findReferensi() {
    const [mapel, kelas, tahunAjaran] = await Promise.all([
      query<{ id: string; kode: string; nama: string; is_active: boolean }>(
        `SELECT id, kode, nama, is_active FROM "MST_MataPelajaran" ORDER BY nama`
      ),
      query<{
        id: string
        nama_kelas: string
        tingkat: string
        jurusan: string | null
        is_active: boolean
      }>(
        `SELECT id, nama_kelas, tingkat, jurusan, is_active
         FROM "MST_Kelas" ORDER BY tingkat, nama_kelas`
      ),
      query<{ id: string; tahun_ajaran: string; semester: string; is_active: boolean }>(
        `SELECT id, tahun_ajaran, semester, is_active
         FROM "MST_TahunAjaran" ORDER BY tahun_ajaran DESC, semester ASC`
      ),
    ])
    return { mapel, kelas, tahunAjaran }
  },

  async findTahunAjaranId(tahun: string, semester: string) {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM "MST_TahunAjaran" WHERE tahun_ajaran = $1 AND semester = $2`,
      [tahun, semester]
    )
    return row?.id ?? null
  },

  findAll() {
    return query<SoalUjianListRecord>(
      `SELECT s.id, s.nama, s.jenis, s.status, s.durasi_menit, s.nilai_kkm,
              s.created_at, s.updated_at,
              m.nama AS mapel_nama, t.tahun_ajaran, t.semester,
              jsonb_array_length(s.data_json -> 'soal') AS jumlah_soal,
              COALESCE(
                (SELECT SUM((e ->> 'bobot')::float8)
                 FROM jsonb_array_elements(s.data_json -> 'soal') e), 0
              ) AS total_bobot,
              ARRAY(
                SELECT k.nama_kelas
                FROM "MST_SoalUjianKelas" sk
                JOIN "MST_Kelas" k ON k.id = sk.kelas_id
                WHERE sk.soal_ujian_id = s.id
                ORDER BY k.tingkat, k.nama_kelas
              ) AS kelas,
              COALESCE(u.full_name, u.username) AS created_by_name
       FROM "MST_SoalUjian" s
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       JOIN "MST_TahunAjaran" t ON t.id = s.tahun_ajaran_id
       LEFT JOIN "CORE_User" u ON u.id = s.created_by
       ORDER BY s.updated_at DESC`
    )
  },

  findById(id: string) {
    return queryOne<SoalUjianDetailRecord>(
      `SELECT s.id, s.nama, s.mapel_id, s.jenis, s.status, s.durasi_menit,
              s.nilai_kkm, s.acak_soal, s.tampilkan_hasil, s.data_json,
              t.tahun_ajaran, t.semester,
              ARRAY(
                SELECT sk.kelas_id::text
                FROM "MST_SoalUjianKelas" sk
                WHERE sk.soal_ujian_id = s.id
              ) AS kelas_ids
       FROM "MST_SoalUjian" s
       JOIN "MST_TahunAjaran" t ON t.id = s.tahun_ajaran_id
       WHERE s.id = $1`,
      [id]
    )
  },

  // Simpan ujian dan distribusi kelasnya dalam satu transaksi.
  // 12 kolom = 12 ekspresi VALUES ($11 dipakai dua kali: created_by dan updated_by),
  // jadi array parameternya berisi 11 nilai.
  create(input: SoalUjianInput, userId: string) {
    return withTransaction(async (client) => {
      const res = await client.query<{ id: string }>(
        `INSERT INTO "MST_SoalUjian"
           (nama, mapel_id, jenis, tahun_ajaran_id, durasi_menit, nilai_kkm,
            acak_soal, tampilkan_hasil, status, data_json, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $11)
         RETURNING id`,
        [
          input.nama,
          input.mapelId,
          input.jenis,
          input.tahunAjaranId,
          input.durasiMenit,
          input.kkm,
          input.acakSoal,
          input.tampilkanHasil,
          input.status,
          JSON.stringify(input.dataJson),
          userId,
        ]
      )
      const id = res.rows[0].id
      await syncKelas(client, id, input.kelasIds, userId)
      return id
    })
  },

  // false kalau data tidak ditemukan. $1 = id, $2..$12 = isi kolom (12 parameter).
  update(id: string, input: SoalUjianInput, userId: string) {
    return withTransaction(async (client) => {
      const res = await client.query(
        `UPDATE "MST_SoalUjian"
         SET nama = $2, mapel_id = $3, jenis = $4, tahun_ajaran_id = $5,
             durasi_menit = $6, nilai_kkm = $7, acak_soal = $8,
             tampilkan_hasil = $9, status = $10, data_json = $11::jsonb,
             updated_by = $12, updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [
          id,
          input.nama,
          input.mapelId,
          input.jenis,
          input.tahunAjaranId,
          input.durasiMenit,
          input.kkm,
          input.acakSoal,
          input.tampilkanHasil,
          input.status,
          JSON.stringify(input.dataJson),
          userId,
        ]
      )
      if (res.rowCount === 0) return false

      await syncKelas(client, id, input.kelasIds, userId)
      return true
    })
  },
}