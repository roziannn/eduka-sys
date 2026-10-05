import { query, queryOne } from "@/lib/db"
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
}
