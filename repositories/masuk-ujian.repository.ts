import { query, queryOne, withTransaction } from "@/lib/db"
import type { UjianDataJson } from "@/types/soal-ujian"

export type UjianByToken = {
  id: string
  nama: string
  jenis: string
  status: string
  durasi_menit: number
  acak_soal: boolean
  data_json: UjianDataJson
  mapel_nama: string
  tahun_ajaran: string
  semester: string
  is_open: boolean // sudah memperhitungkan expires_at
}

export type PercobaanRow = {
  id: string
  soal_ujian_id: string
  status: "Berjalan" | "Selesai"
  urutan_soal: string[]
  skor_pg: number | null
  skor_maks: number | null
  started_ms: number
  deadline_ms: number
  now_ms: number // jam database, dipakai untuk semua perhitungan waktu
}

export type JawabanItem = { soalId: string; jawaban: string[] | string }

// Jam yang dibandingkan selalu jam database supaya konsisten dengan deadline_at
const PERCOBAAN_COLS = `p.id, p.soal_ujian_id, p.status, p.urutan_soal,
  p.skor_pg::float8 AS skor_pg, p.skor_maks::float8 AS skor_maks,
  (EXTRACT(EPOCH FROM p.started_at) * 1000)::float8 AS started_ms,
  (EXTRACT(EPOCH FROM p.deadline_at) * 1000)::float8 AS deadline_ms,
  (EXTRACT(EPOCH FROM NOW()) * 1000)::float8 AS now_ms`

const UPSERT_JAWABAN = `INSERT INTO "TRN_JawabanUjian" (percobaan_id, soal_id, jawaban)
  SELECT $1::uuid, x.soal_id, x.jawaban
  FROM jsonb_to_recordset($2::jsonb) AS x(soal_id text, jawaban jsonb)
  WHERE EXISTS (
    SELECT 1 FROM "TRN_PercobaanUjian" WHERE id = $1 AND status = 'Berjalan'
  )
  ON CONFLICT (percobaan_id, soal_id)
  DO UPDATE SET jawaban = EXCLUDED.jawaban, updated_at = NOW()`

export const masukUjianRepository = {
  // Token disimpan huruf besar. Hanya token yang berlaku (aktif) yang dicari.
  findByToken(token: string) {
    return queryOne<UjianByToken>(
      `SELECT s.id, s.nama, s.jenis, s.status, s.durasi_menit, s.acak_soal, s.data_json,
              m.nama AS mapel_nama, ta.tahun_ajaran, ta.semester,
              (t.is_open AND (t.expires_at IS NULL OR t.expires_at > NOW())) AS is_open
       FROM "MST_TokenUjian" t
       JOIN "MST_SoalUjian" s ON s.id = t.soal_ujian_id
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       JOIN "MST_TahunAjaran" ta ON ta.id = s.tahun_ajaran_id
       WHERE t.token = $1 AND t.is_active AND s.is_active`,
      [token]
    )
  },

  // Siswa boleh ikut kalau kelasnya (pada tahun ajaran ujian) termasuk kelas target ujian
  async isStudentInTargetKelas(userId: string, ujianId: string, tahunAjaran: string) {
    const rows = await query<{ ok: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM "MST_KelasSiswa" ks
         JOIN "MST_SoalUjianKelas" sk ON sk.kelas_id = ks.kelas_id
         WHERE ks.user_id = $1 AND ks.tahun_ajaran = $3 AND sk.soal_ujian_id = $2
       ) AS ok`,
      [userId, ujianId, tahunAjaran]
    )
    return rows[0]?.ok === true
  },

  // Untuk menilai: butuh kunci jawaban, jadi data_json dibaca utuh
  findUjianById(id: string) {
    return queryOne<{
      id: string
      durasi_menit: number
      acak_soal: boolean
      tampilkan_hasil: boolean
      data_json: UjianDataJson
    }>(
      `SELECT id, durasi_menit, acak_soal, tampilkan_hasil, data_json
       FROM "MST_SoalUjian" WHERE id = $1`,
      [id]
    )
  },

  findPercobaan(ujianId: string, userId: string) {
    return queryOne<PercobaanRow>(
      `SELECT ${PERCOBAAN_COLS}
       FROM "TRN_PercobaanUjian" p
       WHERE p.soal_ujian_id = $1 AND p.user_id = $2`,
      [ujianId, userId]
    )
  },

  // Hanya milik user itu sendiri
  findPercobaanById(id: string, userId: string) {
    return queryOne<PercobaanRow>(
      `SELECT ${PERCOBAAN_COLS}
       FROM "TRN_PercobaanUjian" p
       WHERE p.id = $1 AND p.user_id = $2`,
      [id, userId]
    )
  },

  // Percobaan pertama menang: kalau sudah ada, tidak dibuat lagi dan waktu mulai tidak berubah
  async createPercobaan(
    ujianId: string,
    userId: string,
    durasiMenit: number,
    urutanSoal: string[]
  ) {
    await query(
      `INSERT INTO "TRN_PercobaanUjian" (soal_ujian_id, user_id, deadline_at, urutan_soal)
       VALUES ($1, $2, NOW() + make_interval(mins => $3::int), $4::jsonb)
       ON CONFLICT (soal_ujian_id, user_id) DO NOTHING`,
      [ujianId, userId, durasiMenit, JSON.stringify(urutanSoal)]
    )
    return this.findPercobaan(ujianId, userId)
  },

  async findJawaban(percobaanId: string) {
    const rows = await query<{ soal_id: string; jawaban: string[] | string }>(
      `SELECT soal_id, jawaban FROM "TRN_JawabanUjian" WHERE percobaan_id = $1`,
      [percobaanId]
    )
    return new Map(rows.map((r) => [r.soal_id, r.jawaban]))
  },

  // Tidak menyimpan apa pun kalau percobaan sudah selesai
  async saveJawaban(percobaanId: string, items: JawabanItem[]) {
    if (items.length === 0) return
    await query(UPSERT_JAWABAN, [
      percobaanId,
      JSON.stringify(items.map((i) => ({ soal_id: i.soalId, jawaban: i.jawaban }))),
    ])
  },

  // Jawaban terakhir dan penutupan percobaan dalam satu transaksi.
  // false kalau percobaan sudah selesai lebih dulu (dua permintaan bersamaan).
  finalize(
    percobaanId: string,
    items: JawabanItem[],
    skorPg: number,
    skorMaks: number
  ) {
    return withTransaction(async (client) => {
      if (items.length > 0) {
        await client.query(UPSERT_JAWABAN, [
          percobaanId,
          JSON.stringify(items.map((i) => ({ soal_id: i.soalId, jawaban: i.jawaban }))),
        ])
      }
      const res = await client.query(
        `UPDATE "TRN_PercobaanUjian"
         SET status = 'Selesai',
             submitted_at = LEAST(NOW(), deadline_at),
             skor_pg = $2, skor_maks = $3, updated_at = NOW()
         WHERE id = $1 AND status = 'Berjalan'`,
        [percobaanId, skorPg, skorMaks]
      )
      return (res.rowCount ?? 0) > 0
    })
  },
}
