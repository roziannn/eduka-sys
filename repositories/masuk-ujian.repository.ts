import type { PoolClient } from "pg"
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
  skor_essai: number | null
  skor_maks: number | null
  nilai_akhir: number | null
  nilai_tercatat: number | null
  jenis: "Utama" | "Remedial"
  remedial_ke: number
  status_nilai: "Final" | "Menunggu" | null
  started_ms: number
  deadline_ms: number
  now_ms: number // jam database, dipakai untuk semua perhitungan waktu
}

export type JawabanItem = { soalId: string; jawaban: string[] | string }

// Satu baris per soal saat dikumpulkan. nilai null = essai yang menunggu guru.
export type JawabanFinal = {
  soalId: string
  jawaban: string[] | string
  tipe: "PG" | "ESSAI"
  bobot: number
  isBenar: boolean | null
  nilai: number | null
}

export type HasilRow = {
  soal_id: string
  tipe: "PG" | "ESSAI"
  bobot: number
  is_benar: boolean | null
  nilai: number | null
}

// Jam yang dibandingkan selalu jam database supaya konsisten dengan deadline_at
const PERCOBAAN_COLS = `p.id, p.soal_ujian_id, p.status, p.urutan_soal,
  p.skor_pg::float8 AS skor_pg, p.skor_essai::float8 AS skor_essai,
  p.skor_maks::float8 AS skor_maks, p.nilai_akhir::float8 AS nilai_akhir,
  p.nilai_tercatat::float8 AS nilai_tercatat, p.jenis, p.remedial_ke,
  p.status_nilai,
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

// Total skor, status nilai, dan nilai akhir dihitung dari baris jawaban.
// Dipakai saat dikumpulkan dan setiap guru mengubah nilai essai, jadi tidak ada angka ganda.
export async function hitungUlangNilai(client: PoolClient, percobaanId: string) {
  // nilai_tercatat: nilai yang dihitung untuk siswa. Remedial dibatasi paling tinggi KKM ujian.
  await client.query(
    `UPDATE "TRN_PercobaanUjian" p
     SET skor_pg = h.skor_pg,
         skor_essai = h.skor_essai,
         skor_maks = h.skor_maks,
         status_nilai = CASE WHEN h.belum > 0 THEN 'Menunggu' ELSE 'Final' END,
         nilai_akhir = h.nilai,
         nilai_tercatat = CASE
                            WHEN h.nilai IS NULL THEN NULL
                            WHEN p.jenis = 'Remedial' THEN LEAST(h.nilai, s.nilai_kkm)
                            ELSE h.nilai
                          END,
         updated_at = NOW()
     FROM (
       SELECT agg.*,
              CASE
                WHEN agg.belum > 0 THEN NULL
                WHEN agg.skor_maks > 0
                  THEN ROUND((agg.skor_pg + agg.skor_essai) / agg.skor_maks * 100, 2)
                ELSE 0
              END AS nilai
       FROM (
         SELECT COALESCE(SUM(nilai) FILTER (WHERE tipe = 'PG'), 0)    AS skor_pg,
                COALESCE(SUM(nilai) FILTER (WHERE tipe = 'ESSAI'), 0) AS skor_essai,
                COALESCE(SUM(bobot), 0)                               AS skor_maks,
                COUNT(*) FILTER (WHERE tipe = 'ESSAI' AND nilai IS NULL) AS belum
         FROM "TRN_JawabanUjian" WHERE percobaan_id = $1
       ) agg
     ) h, "MST_SoalUjian" s
     WHERE p.id = $1 AND s.id = p.soal_ujian_id`,
    [percobaanId]
  )
}

const TOKEN_WINDOW_MENIT = 15

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

  // Token salah dalam beberapa menit terakhir. menitTunggu = sampai yang tertua keluar dari jendela.
  async hitungTokenGagal(userId: string) {
    const row = await queryOne<{ jumlah: number; menit_tunggu: number | null }>(
      `SELECT COUNT(*)::int AS jumlah,
              CEIL(EXTRACT(EPOCH FROM (MIN(created_at) + make_interval(mins => $2::int) - NOW())) / 60)::int
                AS menit_tunggu
       FROM "TRN_TokenGagal"
       WHERE user_id = $1 AND created_at > NOW() - make_interval(mins => $2::int)`,
      [userId, TOKEN_WINDOW_MENIT]
    )
    return { jumlah: row?.jumlah ?? 0, menitTunggu: Math.max(1, row?.menit_tunggu ?? 1) }
  },

  async catatTokenGagal(userId: string) {
    await query(`INSERT INTO "TRN_TokenGagal" (user_id) VALUES ($1)`, [userId])
    // Catatan lama tidak berguna lagi, dibersihkan sambil lewat
    await query(`DELETE FROM "TRN_TokenGagal" WHERE created_at < NOW() - INTERVAL '1 day'`)
  },

  // Untuk menilai: butuh kunci jawaban, jadi data_json dibaca utuh
  findUjianById(id: string) {
    return queryOne<{
      id: string
      durasi_menit: number
      nama: string
      acak_soal: boolean
      tampilkan_hasil: boolean
      nilai_kkm: number
      data_json: UjianDataJson
    }>(
      `SELECT id, nama, durasi_menit, acak_soal, tampilkan_hasil, nilai_kkm, data_json
       FROM "MST_SoalUjian" WHERE id = $1`,
      [id]
    )
  },

  // Hanya percobaan aktif (yang sudah direset guru tidak dihitung)
  findPercobaan(ujianId: string, userId: string) {
    return queryOne<PercobaanRow>(
      `SELECT ${PERCOBAAN_COLS}
       FROM "TRN_PercobaanUjian" p
       WHERE p.soal_ujian_id = $1 AND p.user_id = $2 AND p.is_active
       ORDER BY p.remedial_ke DESC
       LIMIT 1`,
      [ujianId, userId]
    )
  },

  // Nilai siswa untuk ujian ini: nilai tercatat terbaik dari semua percobaan aktif yang sudah final
  async findNilaiFinal(ujianId: string, userId: string) {
    const row = await queryOne<{ nilai: number | null }>(
      `SELECT MAX(nilai_tercatat)::float8 AS nilai
       FROM "TRN_PercobaanUjian"
       WHERE soal_ujian_id = $1 AND user_id = $2 AND is_active AND status_nilai = 'Final'`,
      [ujianId, userId]
    )
    return row?.nilai ?? null
  },

  // Izin remedial yang sudah diberikan guru tapi belum dipakai siswa
  async findRemedialTersedia(ujianId: string, userId: string) {
    const row = await queryOne<{ remedial_ke: number }>(
      `SELECT remedial_ke FROM "TRN_RemedialUjian"
       WHERE soal_ujian_id = $1 AND user_id = $2
         AND percobaan_id IS NULL AND dibatalkan_at IS NULL`,
      [ujianId, userId]
    )
    return row?.remedial_ke ?? null
  },

  // Hanya milik user itu sendiri
  findPercobaanById(id: string, userId: string) {
    return queryOne<PercobaanRow>(
      `SELECT ${PERCOBAAN_COLS}
       FROM "TRN_PercobaanUjian" p
       WHERE p.id = $1 AND p.user_id = $2 AND p.is_active`,
      [id, userId]
    )
  },

  // Percobaan aktif pertama menang: kalau sudah ada, tidak dibuat lagi dan waktu mulai tidak berubah
  async createPercobaan(
    ujianId: string,
    userId: string,
    durasiMenit: number,
    urutanSoal: string[]
  ) {
    await query(
      `INSERT INTO "TRN_PercobaanUjian" (soal_ujian_id, user_id, deadline_at, urutan_soal)
       VALUES ($1, $2, NOW() + make_interval(mins => $3::int), $4::jsonb)
       ON CONFLICT (soal_ujian_id, user_id, remedial_ke) WHERE is_active DO NOTHING`,
      [ujianId, userId, durasiMenit, JSON.stringify(urutanSoal)]
    )
    return this.findPercobaan(ujianId, userId)
  },

  // Siswa memakai izin remedial: percobaan remedial dibuat dan izinnya ditandai terpakai,
  // dalam satu transaksi. null kalau tidak ada izin (atau sudah dipakai permintaan lain).
  createRemedial(
    ujianId: string,
    userId: string,
    durasiMenit: number,
    urutanSoal: string[]
  ) {
    return withTransaction(async (client) => {
      const izin = await client.query<{ id: string; remedial_ke: number }>(
        `SELECT id, remedial_ke FROM "TRN_RemedialUjian"
         WHERE soal_ujian_id = $1 AND user_id = $2
           AND percobaan_id IS NULL AND dibatalkan_at IS NULL
         FOR UPDATE`,
        [ujianId, userId]
      )
      if (izin.rows.length === 0) return false

      const { id: izinId, remedial_ke: ke } = izin.rows[0]
      const baru = await client.query<{ id: string }>(
        `INSERT INTO "TRN_PercobaanUjian"
           (soal_ujian_id, user_id, deadline_at, urutan_soal, jenis, remedial_ke)
         VALUES ($1, $2, NOW() + make_interval(mins => $3::int), $4::jsonb, 'Remedial', $5)
         ON CONFLICT (soal_ujian_id, user_id, remedial_ke) WHERE is_active DO NOTHING
         RETURNING id`,
        [ujianId, userId, durasiMenit, JSON.stringify(urutanSoal), ke]
      )
      if (baru.rows.length === 0) return false

      await client.query(
        `UPDATE "TRN_RemedialUjian" SET percobaan_id = $2, digunakan_at = NOW() WHERE id = $1`,
        [izinId, baru.rows[0].id]
      )
      return true
    })
  },

  async findJawaban(percobaanId: string) {
    const rows = await query<{ soal_id: string; jawaban: string[] | string }>(
      `SELECT soal_id, jawaban FROM "TRN_JawabanUjian" WHERE percobaan_id = $1`,
      [percobaanId]
    )
    return new Map(rows.map((r) => [r.soal_id, r.jawaban]))
  },

  findHasilRows(percobaanId: string) {
    return query<HasilRow>(
      `SELECT soal_id, tipe, bobot::float8 AS bobot, is_benar, nilai::float8 AS nilai
       FROM "TRN_JawabanUjian" WHERE percobaan_id = $1`,
      [percobaanId]
    )
  },

  // Tidak menyimpan apa pun kalau percobaan sudah selesai
  async saveJawaban(percobaanId: string, items: JawabanItem[]) {
    if (items.length === 0) return
    await query(UPSERT_JAWABAN, [
      percobaanId,
      JSON.stringify(items.map((i) => ({ soal_id: i.soalId, jawaban: i.jawaban }))),
    ])
  },

  // Tutup percobaan dan tulis satu baris nilai per soal dalam satu transaksi.
  // false kalau percobaan sudah selesai lebih dulu (dua permintaan bersamaan):
  // dalam kasus itu baris jawaban tidak disentuh, supaya nilai dari guru tidak tertimpa.
  finalize(percobaanId: string, rows: JawabanFinal[]) {
    return withTransaction(async (client) => {
      const closed = await client.query(
        `UPDATE "TRN_PercobaanUjian"
         SET status = 'Selesai', submitted_at = LEAST(NOW(), deadline_at), updated_at = NOW()
         WHERE id = $1 AND status = 'Berjalan' AND is_active`,
        [percobaanId]
      )
      if ((closed.rowCount ?? 0) === 0) return false

      if (rows.length > 0) {
        await client.query(
          `INSERT INTO "TRN_JawabanUjian"
             (percobaan_id, soal_id, jawaban, tipe, bobot, is_benar, nilai)
           SELECT $1::uuid, x.soal_id, x.jawaban, x.tipe, x.bobot, x.is_benar, x.nilai
           FROM jsonb_to_recordset($2::jsonb)
                AS x(soal_id text, jawaban jsonb, tipe text, bobot numeric, is_benar boolean, nilai numeric)
           ON CONFLICT (percobaan_id, soal_id)
           DO UPDATE SET jawaban = EXCLUDED.jawaban, tipe = EXCLUDED.tipe, bobot = EXCLUDED.bobot,
                         is_benar = EXCLUDED.is_benar, nilai = EXCLUDED.nilai, updated_at = NOW()`,
          [
            percobaanId,
            JSON.stringify(
              rows.map((r) => ({
                soal_id: r.soalId,
                jawaban: r.jawaban,
                tipe: r.tipe,
                bobot: r.bobot,
                is_benar: r.isBenar,
                nilai: r.nilai,
              }))
            ),
          ]
        )
      }
      await hitungUlangNilai(client, percobaanId)
      return true
    })
  },
}
