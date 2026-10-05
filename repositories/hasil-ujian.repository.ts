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
  rata_rata: number | null
}

export type PesertaRow = {
  user_id: string
  nama: string
  nisn: string | null
  kelas: string
  percobaan_id: string | null
  status: "Berjalan" | "Selesai" | null
  status_nilai: "Final" | "Menunggu" | null
  skor_maks: number | null
  nilai_akhir: number | null
  started_at: Date | null
  submitted_at: Date | null
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
  findUjianList() {
    return query<UjianHasilRow>(
      `SELECT s.id, s.nama, s.jenis, s.status, s.nilai_kkm,
              m.nama AS mapel_nama, ta.tahun_ajaran, ta.semester, t.token,
              (SELECT COUNT(DISTINCT ks.user_id)
               FROM "MST_SoalUjianKelas" sk
               JOIN "MST_KelasSiswa" ks
                 ON ks.kelas_id = sk.kelas_id AND ks.tahun_ajaran = ta.tahun_ajaran
               WHERE sk.soal_ujian_id = s.id)::int AS total_peserta,
              COUNT(p.id) FILTER (WHERE p.status = 'Selesai')::int AS selesai,
              COUNT(p.id) FILTER (WHERE p.status = 'Berjalan')::int AS berjalan,
              COUNT(p.id) FILTER (WHERE p.status = 'Selesai' AND p.status_nilai = 'Menunggu')::int AS menunggu,
              AVG(p.nilai_akhir)::float8 AS rata_rata
       FROM "MST_SoalUjian" s
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       JOIN "MST_TahunAjaran" ta ON ta.id = s.tahun_ajaran_id
       LEFT JOIN "MST_TokenUjian" t ON t.soal_ujian_id = s.id AND t.is_active
       LEFT JOIN "TRN_PercobaanUjian" p ON p.soal_ujian_id = s.id AND p.is_active
       WHERE s.is_active
       GROUP BY s.id, m.nama, ta.tahun_ajaran, ta.semester, t.token
       ORDER BY s.created_at DESC`
    )
  },

  findUjianHeader(id: string) {
    return queryOne<UjianHasilRow>(
      `SELECT s.id, s.nama, s.jenis, s.status, s.nilai_kkm,
              m.nama AS mapel_nama, ta.tahun_ajaran, ta.semester, t.token,
              0 AS total_peserta, 0 AS selesai, 0 AS berjalan, 0 AS menunggu,
              NULL::float8 AS rata_rata
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
              p.id AS percobaan_id, p.status, p.status_nilai,
              p.skor_maks::float8 AS skor_maks, p.nilai_akhir::float8 AS nilai_akhir,
              p.started_at, p.submitted_at
       FROM "MST_SoalUjianKelas" sk
       JOIN "MST_Kelas" k ON k.id = sk.kelas_id
       JOIN "MST_KelasSiswa" ks ON ks.kelas_id = sk.kelas_id AND ks.tahun_ajaran = $2
       JOIN "CORE_User" u ON u.id = ks.user_id
       LEFT JOIN "TRN_PercobaanUjian" p
         ON p.soal_ujian_id = sk.soal_ujian_id AND p.user_id = u.id AND p.is_active
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

  // Ujian ulang: percobaan lama disimpan sebagai riwayat, siswa bisa mulai lagi
  async resetPercobaan(percobaanId: string, alasan: string, actorId: string) {
    const row = await queryOne<{ id: string }>(
      `UPDATE "TRN_PercobaanUjian"
       SET is_active = FALSE, direset_oleh = $3, direset_at = NOW(), alasan_reset = $2,
           updated_at = NOW()
       WHERE id = $1 AND is_active
       RETURNING id`,
      [percobaanId, alasan, actorId]
    )
    return row !== null
  },
}
