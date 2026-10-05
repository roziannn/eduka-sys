import { query, queryOne, withTransaction } from "@/lib/db"
import { hitungUlangNilai } from "@/repositories/masuk-ujian.repository"
import type { UjianDataJson } from "@/types/soal-ujian"

export type UjianHasilRow = {
  id: string
  nama: string
  jenis: string
  status: string
  nilai_kkm: number
  mapel_nama: string
  tahun_ajaran: string
  semester: string
  token: string | null
  total_peserta: number
  selesai: number
  berjalan: number
  menunggu: number
  perlu_remedial: number
  rata_rata: number | null
}

export type PesertaRow = {
  user_id: string
  nama: string
  nisn: string | null
  kelas: string
  percobaan_id: string | null // percobaan terakhir (awal atau remedial)
  status: "Berjalan" | "Selesai" | null
  status_nilai: "Final" | "Menunggu" | null
  jenis: "Utama" | "Remedial" | null
  remedial_ke: number | null
  nilai_final: number | null // nilai tercatat terbaik dari semua percobaan yang sudah final
  remedial_dipakai: number // izin remedial yang diberikan (belum dibatalkan)
  izin_menunggu_ke: number | null // izin remedial yang belum dipakai siswa
  started_at: Date | null
  submitted_at: Date | null
  riwayat: RiwayatItem[]
}

export type RiwayatItem = {
  percobaanId: string
  jenis: "Utama" | "Remedial"
  remedialKe: number
  status: "Berjalan" | "Selesai"
  statusNilai: "Final" | "Menunggu" | null
  nilai: number | null
  nilaiTercatat: number | null
  mulai: string
  selesai: string | null
}

export type PercobaanDetailRow = {
  id: string
  soal_ujian_id: string
  status: "Berjalan" | "Selesai"
  status_nilai: "Final" | "Menunggu" | null
  skor_pg: number | null
  skor_essai: number | null
  skor_maks: number | null
  nilai_akhir: number | null
  nilai_tercatat: number | null
  jenis: "Utama" | "Remedial"
  remedial_ke: number
  started_at: Date
  submitted_at: Date | null
  is_active: boolean
  nama: string
  nisn: string | null
  ujian_nama: string
  nilai_kkm: number
  data_json: UjianDataJson
}

export type JawabanDetailRow = {
  soal_id: string
  jawaban: string[] | string
  tipe: "PG" | "ESSAI" | null
  bobot: number | null
  is_benar: boolean | null
  nilai: number | null
  catatan: string | null
}

export const hasilUjianRepository = {
  // Hitungan per ujian memakai subquery supaya percobaan remedial tidak menggandakan baris.
  // "perlu_remedial" = siswa yang nilai terbaiknya masih di bawah KKM.
  findUjianList() {
    return query<UjianHasilRow>(
      `WITH siswa_terakhir AS (
         -- percobaan aktif terakhir (awal atau remedial) tiap siswa
         SELECT DISTINCT ON (soal_ujian_id, user_id)
                soal_ujian_id, user_id, status, status_nilai
         FROM "TRN_PercobaanUjian"
         WHERE is_active
         ORDER BY soal_ujian_id, user_id, remedial_ke DESC
       ),
       siswa_nilai AS (
         -- nilai terbaik tiap siswa dari percobaan yang sudah final
         SELECT soal_ujian_id, user_id, MAX(nilai_tercatat) AS nilai_final
         FROM "TRN_PercobaanUjian"
         WHERE is_active AND status_nilai = 'Final'
         GROUP BY soal_ujian_id, user_id
       )
       SELECT s.id, s.nama, s.jenis, s.status, s.nilai_kkm,
              m.nama AS mapel_nama, ta.tahun_ajaran, ta.semester, t.token,
              (SELECT COUNT(DISTINCT ks.user_id)
               FROM "MST_SoalUjianKelas" sk
               JOIN "MST_KelasSiswa" ks
                 ON ks.kelas_id = sk.kelas_id AND ks.tahun_ajaran = ta.tahun_ajaran
               WHERE sk.soal_ujian_id = s.id)::int AS total_peserta,
              -- siswa yang percobaan terakhirnya sudah dikumpulkan / sedang berjalan
              (SELECT COUNT(*) FROM siswa_terakhir x
               WHERE x.soal_ujian_id = s.id AND x.status = 'Selesai')::int AS selesai,
              (SELECT COUNT(*) FROM siswa_terakhir x
               WHERE x.soal_ujian_id = s.id AND x.status = 'Berjalan')::int AS berjalan,
              (SELECT COUNT(*) FROM siswa_terakhir x
               WHERE x.soal_ujian_id = s.id AND x.status = 'Selesai'
                 AND x.status_nilai = 'Menunggu')::int AS menunggu,
              (SELECT COUNT(*) FROM siswa_nilai n
               WHERE n.soal_ujian_id = s.id AND n.nilai_final < s.nilai_kkm)::int AS perlu_remedial,
              (SELECT AVG(n.nilai_final) FROM siswa_nilai n
               WHERE n.soal_ujian_id = s.id)::float8 AS rata_rata
       FROM "MST_SoalUjian" s
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       JOIN "MST_TahunAjaran" ta ON ta.id = s.tahun_ajaran_id
       LEFT JOIN "MST_TokenUjian" t ON t.soal_ujian_id = s.id AND t.is_active
       WHERE s.is_active
       ORDER BY s.created_at DESC`
    )
  },

  findUjianHeader(id: string) {
    return queryOne<UjianHasilRow>(
      `SELECT s.id, s.nama, s.jenis, s.status, s.nilai_kkm,
              m.nama AS mapel_nama, ta.tahun_ajaran, ta.semester, t.token,
              0 AS total_peserta, 0 AS selesai, 0 AS berjalan, 0 AS menunggu,
              0 AS perlu_remedial, NULL::float8 AS rata_rata
       FROM "MST_SoalUjian" s
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       JOIN "MST_TahunAjaran" ta ON ta.id = s.tahun_ajaran_id
       LEFT JOIN "MST_TokenUjian" t ON t.soal_ujian_id = s.id AND t.is_active
       WHERE s.id = $1`,
      [id]
    )
  },

  // Semua siswa di kelas target ujian, termasuk yang belum mengerjakan
  findPeserta(ujianId: string, tahunAjaran: string) {
    return query<PesertaRow>(
      `SELECT u.id AS user_id,
              COALESCE(NULLIF(u.full_name, ''), u.username) AS nama,
              u.nip_nisn AS nisn, k.nama_kelas AS kelas,
              cur.id AS percobaan_id, cur.status, cur.status_nilai,
              cur.jenis, cur.remedial_ke,
              cur.started_at, cur.submitted_at,
              fin.nilai_final,
              COALESCE(cnt.dipakai, 0) AS remedial_dipakai,
              izin.remedial_ke AS izin_menunggu_ke,
              COALESCE(riw.riwayat, '[]'::json) AS riwayat
       FROM "MST_SoalUjianKelas" sk
       JOIN "MST_Kelas" k ON k.id = sk.kelas_id
       JOIN "MST_KelasSiswa" ks ON ks.kelas_id = sk.kelas_id AND ks.tahun_ajaran = $2
       JOIN "CORE_User" u ON u.id = ks.user_id
       LEFT JOIN LATERAL (
         SELECT p.* FROM "TRN_PercobaanUjian" p
         WHERE p.soal_ujian_id = sk.soal_ujian_id AND p.user_id = u.id AND p.is_active
         ORDER BY p.remedial_ke DESC LIMIT 1
       ) cur ON TRUE
       LEFT JOIN LATERAL (
         SELECT MAX(p.nilai_tercatat)::float8 AS nilai_final
         FROM "TRN_PercobaanUjian" p
         WHERE p.soal_ujian_id = sk.soal_ujian_id AND p.user_id = u.id
           AND p.is_active AND p.status_nilai = 'Final'
       ) fin ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS dipakai FROM "TRN_RemedialUjian" r
         WHERE r.soal_ujian_id = sk.soal_ujian_id AND r.user_id = u.id AND r.dibatalkan_at IS NULL
       ) cnt ON TRUE
       LEFT JOIN LATERAL (
         SELECT r.remedial_ke FROM "TRN_RemedialUjian" r
         WHERE r.soal_ujian_id = sk.soal_ujian_id AND r.user_id = u.id
           AND r.percobaan_id IS NULL AND r.dibatalkan_at IS NULL
       ) izin ON TRUE
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object(
                  'percobaanId', p.id, 'jenis', p.jenis, 'remedialKe', p.remedial_ke,
                  'status', p.status, 'statusNilai', p.status_nilai,
                  'nilai', p.nilai_akhir::float8, 'nilaiTercatat', p.nilai_tercatat::float8,
                  'mulai', p.started_at, 'selesai', p.submitted_at
                ) ORDER BY p.remedial_ke) AS riwayat
         FROM "TRN_PercobaanUjian" p
         WHERE p.soal_ujian_id = sk.soal_ujian_id AND p.user_id = u.id AND p.is_active
       ) riw ON TRUE
       WHERE sk.soal_ujian_id = $1
       ORDER BY k.nama_kelas, nama`,
      [ujianId, tahunAjaran]
    )
  },

  findPercobaanDetail(id: string) {
    return queryOne<PercobaanDetailRow>(
      `SELECT p.id, p.soal_ujian_id, p.status, p.status_nilai,
              p.skor_pg::float8 AS skor_pg, p.skor_essai::float8 AS skor_essai,
              p.skor_maks::float8 AS skor_maks, p.nilai_akhir::float8 AS nilai_akhir,
              p.nilai_tercatat::float8 AS nilai_tercatat, p.jenis, p.remedial_ke,
              p.started_at, p.submitted_at, p.is_active,
              COALESCE(NULLIF(u.full_name, ''), u.username) AS nama, u.nip_nisn AS nisn,
              s.nama AS ujian_nama, s.nilai_kkm, s.data_json
       FROM "TRN_PercobaanUjian" p
       JOIN "CORE_User" u ON u.id = p.user_id
       JOIN "MST_SoalUjian" s ON s.id = p.soal_ujian_id
       WHERE p.id = $1`,
      [id]
    )
  },

  findJawabanDetail(percobaanId: string) {
    return query<JawabanDetailRow>(
      `SELECT soal_id, jawaban, tipe, bobot::float8 AS bobot, is_benar,
              nilai::float8 AS nilai, catatan
       FROM "TRN_JawabanUjian" WHERE percobaan_id = $1`,
      [percobaanId]
    )
  },

  // Nilai satu soal essai, lalu total dihitung ulang. false kalau barisnya bukan essai
  // milik percobaan yang sudah dikumpulkan dan masih aktif.
  nilaiEssai(
    percobaanId: string,
    soalId: string,
    nilai: number,
    catatan: string | null,
    graderId: string
  ) {
    return withTransaction(async (client) => {
      const res = await client.query(
        `UPDATE "TRN_JawabanUjian" j
         SET nilai = $3, catatan = $4, dinilai_oleh = $5, dinilai_at = NOW(), updated_at = NOW()
         FROM "TRN_PercobaanUjian" p
         WHERE j.percobaan_id = p.id AND p.id = $1 AND p.status = 'Selesai' AND p.is_active
           AND j.soal_id = $2 AND j.tipe = 'ESSAI'`,
        [percobaanId, soalId, nilai, catatan, graderId]
      )
      if ((res.rowCount ?? 0) === 0) return false
      await hitungUlangNilai(client, percobaanId)
      return true
    })
  },

  // Ujian ulang (kendala teknis dsb): percobaan disimpan sebagai riwayat dan siswa bisa mulai lagi.
  // Hanya percobaan aktif TERAKHIR yang boleh direset, supaya urutan percobaan tidak rusak.
  // - percobaan remedial yang direset: izin remedialnya dibuka lagi (siswa mengulang remedial itu)
  // - izin remedial yang belum dipakai ikut dibatalkan kalau yang direset percobaan awal
  // Hasil: "ok", "bukan-terakhir", atau "tidak-ada".
  resetPercobaan(percobaanId: string, alasan: string, actorId: string) {
    return withTransaction(async (client) => {
      const cur = await client.query<{ soal_ujian_id: string; user_id: string; remedial_ke: number }>(
        `SELECT soal_ujian_id, user_id, remedial_ke FROM "TRN_PercobaanUjian"
         WHERE id = $1 AND is_active FOR UPDATE`,
        [percobaanId]
      )
      if (cur.rows.length === 0) return "tidak-ada" as const
      const { soal_ujian_id, user_id, remedial_ke } = cur.rows[0]

      const lebihBaru = await client.query(
        `SELECT 1 FROM "TRN_PercobaanUjian"
         WHERE soal_ujian_id = $1 AND user_id = $2 AND is_active AND remedial_ke > $3`,
        [soal_ujian_id, user_id, remedial_ke]
      )
      if (lebihBaru.rows.length > 0) return "bukan-terakhir" as const

      await client.query(
        `UPDATE "TRN_PercobaanUjian"
         SET is_active = FALSE, direset_oleh = $3, direset_at = NOW(), alasan_reset = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [percobaanId, alasan, actorId]
      )

      // Izin remedial milik percobaan ini dibuka lagi
      await client.query(
        `UPDATE "TRN_RemedialUjian" SET percobaan_id = NULL, digunakan_at = NULL
         WHERE percobaan_id = $1`,
        [percobaanId]
      )
      // Percobaan awal direset: izin remedial yang belum dipakai tidak berlaku lagi
      if (remedial_ke === 0) {
        await client.query(
          `UPDATE "TRN_RemedialUjian" SET dibatalkan_at = NOW()
           WHERE soal_ujian_id = $1 AND user_id = $2
             AND percobaan_id IS NULL AND dibatalkan_at IS NULL`,
          [soal_ujian_id, user_id]
        )
      }
      return "ok" as const
    })
  },

  // Data untuk memutuskan apakah remedial boleh diberikan
  async findStatusRemedial(ujianId: string, userId: string) {
    const [terakhir, final, izin] = await Promise.all([
      queryOne<{ status: string; status_nilai: string | null; remedial_ke: number }>(
        `SELECT status, status_nilai, remedial_ke FROM "TRN_PercobaanUjian"
         WHERE soal_ujian_id = $1 AND user_id = $2 AND is_active
         ORDER BY remedial_ke DESC LIMIT 1`,
        [ujianId, userId]
      ),
      queryOne<{ nilai: number | null }>(
        `SELECT MAX(nilai_tercatat)::float8 AS nilai FROM "TRN_PercobaanUjian"
         WHERE soal_ujian_id = $1 AND user_id = $2 AND is_active AND status_nilai = 'Final'`,
        [ujianId, userId]
      ),
      queryOne<{ dipakai: number; menunggu: number }>(
        `SELECT COUNT(*)::int AS dipakai,
                COUNT(*) FILTER (WHERE percobaan_id IS NULL)::int AS menunggu
         FROM "TRN_RemedialUjian"
         WHERE soal_ujian_id = $1 AND user_id = $2 AND dibatalkan_at IS NULL`,
        [ujianId, userId]
      ),
    ])
    return {
      terakhir,
      nilaiFinal: final?.nilai ?? null,
      dipakai: izin?.dipakai ?? 0,
      menunggu: izin?.menunggu ?? 0,
    }
  },

  async beriRemedial(
    ujianId: string,
    userId: string,
    remedialKe: number,
    catatan: string | null,
    actorId: string
  ) {
    await query(
      `INSERT INTO "TRN_RemedialUjian"
         (soal_ujian_id, user_id, remedial_ke, catatan, diberikan_oleh)
       VALUES ($1, $2, $3, $4, $5)`,
      [ujianId, userId, remedialKe, catatan, actorId]
    )
  },

  // Hanya izin yang belum dipakai siswa
  async batalkanRemedial(ujianId: string, userId: string) {
    const row = await queryOne<{ id: string }>(
      `UPDATE "TRN_RemedialUjian" SET dibatalkan_at = NOW()
       WHERE soal_ujian_id = $1 AND user_id = $2
         AND percobaan_id IS NULL AND dibatalkan_at IS NULL
       RETURNING id`,
      [ujianId, userId]
    )
    return row !== null
  },
}
