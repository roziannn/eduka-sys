import { query, queryOne } from "@/lib/db"

// Nilai siswa untuk satu ujian = nilai tercatat terbaik dari percobaan aktif yang sudah final
// (sama seperti halaman hasil ujian). Dipakai ulang oleh semua query nilai di bawah.
const NILAI_CTE = `
  nilai AS (
    SELECT p.soal_ujian_id, p.user_id,
           MAX(p.nilai_tercatat)::float8 AS nilai,
           MAX(p.submitted_at) AS submitted_at
    FROM "TRN_PercobaanUjian" p
    WHERE p.is_active AND p.status_nilai = 'Final'
    GROUP BY p.soal_ujian_id, p.user_id
  )`

// Ujian yang dihitung: aktif, dan untuk guru hanya yang dibuatnya sendiri.
// $1 = NULL berarti semua ujian (admin).
const OWNER = `s.is_active AND ($1::uuid IS NULL OR s.created_by = $1::uuid)`

export type CountRow = { label: string; jumlah: number }

export type AdminRingkasanRow = {
  siswa: number
  guru: number
  admin: number
  kelas: number
  mapel: number
  ujian_siap: number
  ujian_draft: number
  token_terbuka: number
  sedang_mengerjakan: number
}

export type UjianRingkasanRow = {
  total_ujian: number
  ujian_siap: number
  token_terbuka: number
  perlu_dinilai: number
  rata_rata: number | null
  total_nilai: number
  tuntas: number
}

export type TrenRow = { tanggal: string; jumlah: number }
export type NilaiMapelRow = { label: string; rata_rata: number; jumlah: number }
export type SiswaKelasRow = { label: string; jumlah: number; kapasitas: number }

export type UjianTerbaruRow = {
  id: string
  nama: string
  mapel: string
  jenis: string
  status: string
  token_open: boolean
  kelas: string[]
  peserta: number
  selesai: number
  rata_rata: number | null
}

export type PerluDinilaiRow = {
  ujian_id: string
  ujian: string
  mapel: string
  jumlah: number
}

export type PartisipasiRow = {
  ujian: string
  jenis: string
  total: number
  selesai: number
  rata_rata: number | null
  kkm: number
}

export type SiswaProfilRow = {
  nama: string
  nisn: string | null
  kelas: string | null
  tahun_ajaran: string | null
  semester: string | null
}

export type SiswaUjianRow = {
  id: string
  nama: string
  mapel: string
  jenis: string
  kkm: number
  durasi_menit: number
  token_open: boolean
  status: "Berjalan" | "Selesai" | null
  status_nilai: "Final" | "Menunggu" | null
  nilai: number | null
}

export type RiwayatNilaiRow = {
  ujian: string
  mapel: string
  jenis: string
  kkm: number
  nilai: number
  tanggal: Date
}

export const dashboardRepository = {
  // ---------- ADMIN ----------
  adminRingkasan() {
    return queryOne<AdminRingkasanRow>(
      `SELECT
         (SELECT COUNT(*) FROM "CORE_User" u JOIN "CORE_Role" r ON r.id = u.role_id
          WHERE u.is_active AND r.normalized_name = 'STUDENT')::int AS siswa,
         (SELECT COUNT(*) FROM "CORE_User" u JOIN "CORE_Role" r ON r.id = u.role_id
          WHERE u.is_active AND r.normalized_name = 'TEACHER')::int AS guru,
         (SELECT COUNT(*) FROM "CORE_User" u JOIN "CORE_Role" r ON r.id = u.role_id
          WHERE u.is_active AND r.normalized_name = 'ADMIN')::int AS admin,
         (SELECT COUNT(*) FROM "MST_Kelas" WHERE is_active)::int AS kelas,
         (SELECT COUNT(*) FROM "MST_MataPelajaran" WHERE is_active)::int AS mapel,
         (SELECT COUNT(*) FROM "MST_SoalUjian" WHERE is_active AND status = 'Siap Ujian')::int AS ujian_siap,
         (SELECT COUNT(*) FROM "MST_SoalUjian" WHERE is_active AND status = 'Draft')::int AS ujian_draft,
         (SELECT COUNT(*) FROM "MST_TokenUjian" t JOIN "MST_SoalUjian" s ON s.id = t.soal_ujian_id
          WHERE t.is_active AND s.is_active
            AND t.is_open AND (t.expires_at IS NULL OR t.expires_at > NOW()))::int AS token_terbuka,
         (SELECT COUNT(*) FROM "TRN_PercobaanUjian"
          WHERE is_active AND status = 'Berjalan')::int AS sedang_mengerjakan`
    )
  },

  penggunaPerRole() {
    return query<CountRow>(
      `SELECT r.name AS label, COUNT(u.id)::int AS jumlah
       FROM "CORE_Role" r
       LEFT JOIN "CORE_User" u ON u.role_id = r.id AND u.is_active
       GROUP BY r.id, r.name
       ORDER BY jumlah DESC, r.name`
    )
  },

  // Isi kelas pada tahun ajaran aktif dibandingkan dengan kapasitasnya
  siswaPerKelas() {
    return query<SiswaKelasRow>(
      `SELECT k.nama_kelas AS label, k.kapasitas,
              COUNT(ks.user_id)::int AS jumlah
       FROM "MST_Kelas" k
       LEFT JOIN "MST_KelasSiswa" ks
         ON ks.kelas_id = k.id
        AND ks.tahun_ajaran = (SELECT tahun_ajaran FROM "MST_TahunAjaran" WHERE is_active LIMIT 1)
       WHERE k.is_active
       GROUP BY k.id, k.nama_kelas, k.kapasitas, k.tingkat
       ORDER BY k.tingkat, k.nama_kelas`
    )
  },

  ujianPerJenis() {
    return query<CountRow>(
      `SELECT jenis AS label, COUNT(*)::int AS jumlah
       FROM "MST_SoalUjian" WHERE is_active
       GROUP BY jenis ORDER BY jenis`
    )
  },

  // ---------- ADMIN & GURU (guru dibatasi ujian miliknya lewat $1) ----------
  ujianRingkasan(ownerId: string | null) {
    return queryOne<UjianRingkasanRow>(
      `WITH ${NILAI_CTE}
       SELECT
         (SELECT COUNT(*) FROM "MST_SoalUjian" s WHERE ${OWNER})::int AS total_ujian,
         (SELECT COUNT(*) FROM "MST_SoalUjian" s
          WHERE ${OWNER} AND s.status = 'Siap Ujian')::int AS ujian_siap,
         (SELECT COUNT(*) FROM "MST_TokenUjian" t
          JOIN "MST_SoalUjian" s ON s.id = t.soal_ujian_id
          WHERE ${OWNER} AND t.is_active
            AND t.is_open AND (t.expires_at IS NULL OR t.expires_at > NOW()))::int AS token_terbuka,
         (SELECT COUNT(DISTINCT p.id) FROM "TRN_PercobaanUjian" p
          JOIN "MST_SoalUjian" s ON s.id = p.soal_ujian_id
          WHERE ${OWNER} AND p.is_active AND p.status = 'Selesai'
            AND p.status_nilai = 'Menunggu')::int AS perlu_dinilai,
         (SELECT AVG(n.nilai) FROM nilai n JOIN "MST_SoalUjian" s ON s.id = n.soal_ujian_id
          WHERE ${OWNER})::float8 AS rata_rata,
         (SELECT COUNT(*) FROM nilai n JOIN "MST_SoalUjian" s ON s.id = n.soal_ujian_id
          WHERE ${OWNER})::int AS total_nilai,
         (SELECT COUNT(*) FROM nilai n JOIN "MST_SoalUjian" s ON s.id = n.soal_ujian_id
          WHERE ${OWNER} AND n.nilai >= s.nilai_kkm)::int AS tuntas`,
      [ownerId]
    )
  },

  // Jumlah ujian yang dikumpulkan per hari, hari tanpa data tetap muncul sebagai 0
  trenPengumpulan(ownerId: string | null, hari: number) {
    return query<TrenRow>(
      `SELECT to_char(d.tgl, 'YYYY-MM-DD') AS tanggal, COALESCE(c.jumlah, 0)::int AS jumlah
       FROM generate_series(
              (NOW() AT TIME ZONE 'Asia/Jakarta')::date - ($2::int - 1),
              (NOW() AT TIME ZONE 'Asia/Jakarta')::date,
              INTERVAL '1 day'
            ) AS d(tgl)
       LEFT JOIN (
         SELECT (p.submitted_at AT TIME ZONE 'Asia/Jakarta')::date AS tgl, COUNT(*) AS jumlah
         FROM "TRN_PercobaanUjian" p
         JOIN "MST_SoalUjian" s ON s.id = p.soal_ujian_id
         WHERE ${OWNER} AND p.is_active AND p.status = 'Selesai'
         GROUP BY 1
       ) c ON c.tgl = d.tgl::date
       ORDER BY d.tgl`,
      [ownerId, hari]
    )
  },

  // Sebaran nilai per rentang 10 poin (0-9 = 0-9,99 ... 9 = 90-100)
  sebaranNilai(ownerId: string | null) {
    return query<{ bin: number; jumlah: number }>(
      `WITH ${NILAI_CTE}
       SELECT LEAST(FLOOR(n.nilai / 10), 9)::int AS bin, COUNT(*)::int AS jumlah
       FROM nilai n JOIN "MST_SoalUjian" s ON s.id = n.soal_ujian_id
       WHERE ${OWNER}
       GROUP BY 1 ORDER BY 1`,
      [ownerId]
    )
  },

  nilaiPerMapel(ownerId: string | null) {
    return query<NilaiMapelRow>(
      `WITH ${NILAI_CTE}
       SELECT m.nama AS label, AVG(n.nilai)::float8 AS rata_rata, COUNT(*)::int AS jumlah
       FROM nilai n
       JOIN "MST_SoalUjian" s ON s.id = n.soal_ujian_id
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       WHERE ${OWNER}
       GROUP BY m.id, m.nama
       ORDER BY rata_rata DESC
       LIMIT 8`,
      [ownerId]
    )
  },

  ujianTerbaru(ownerId: string | null) {
    return query<UjianTerbaruRow>(
      `WITH ${NILAI_CTE},
       terakhir AS (
         SELECT DISTINCT ON (soal_ujian_id, user_id) soal_ujian_id, user_id, status
         FROM "TRN_PercobaanUjian" WHERE is_active
         ORDER BY soal_ujian_id, user_id, remedial_ke DESC
       )
       SELECT s.id, s.nama, m.nama AS mapel, s.jenis, s.status,
              COALESCE(tk.is_open AND (tk.expires_at IS NULL OR tk.expires_at > NOW()), FALSE) AS token_open,
              ARRAY(
                SELECT k.nama_kelas FROM "MST_SoalUjianKelas" sk
                JOIN "MST_Kelas" k ON k.id = sk.kelas_id
                WHERE sk.soal_ujian_id = s.id ORDER BY k.tingkat, k.nama_kelas
              ) AS kelas,
              (SELECT COUNT(DISTINCT ks.user_id)
               FROM "MST_SoalUjianKelas" sk
               JOIN "MST_KelasSiswa" ks ON ks.kelas_id = sk.kelas_id AND ks.tahun_ajaran = ta.tahun_ajaran
               WHERE sk.soal_ujian_id = s.id)::int AS peserta,
              (SELECT COUNT(*) FROM terakhir x
               WHERE x.soal_ujian_id = s.id AND x.status = 'Selesai')::int AS selesai,
              (SELECT AVG(n.nilai) FROM nilai n WHERE n.soal_ujian_id = s.id)::float8 AS rata_rata
       FROM "MST_SoalUjian" s
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       JOIN "MST_TahunAjaran" ta ON ta.id = s.tahun_ajaran_id
       LEFT JOIN "MST_TokenUjian" tk ON tk.soal_ujian_id = s.id AND tk.is_active
       WHERE ${OWNER}
       ORDER BY s.updated_at DESC
       LIMIT 6`,
      [ownerId]
    )
  },

  // Percobaan yang masih menunggu penilaian essai, dikelompokkan per ujian
  perluDinilai(ownerId: string | null) {
    return query<PerluDinilaiRow>(
      `SELECT s.id AS ujian_id, s.nama AS ujian, m.nama AS mapel, COUNT(*)::int AS jumlah
       FROM "TRN_PercobaanUjian" p
       JOIN "MST_SoalUjian" s ON s.id = p.soal_ujian_id
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       WHERE ${OWNER} AND p.is_active AND p.status = 'Selesai' AND p.status_nilai = 'Menunggu'
       GROUP BY s.id, s.nama, m.nama
       ORDER BY jumlah DESC, s.nama
       LIMIT 5`,
      [ownerId]
    )
  },

  // Partisipasi dan rata-rata nilai per ujian (untuk grafik guru)
  partisipasiUjian(ownerId: string | null) {
    return query<PartisipasiRow>(
      `WITH ${NILAI_CTE}
       SELECT s.nama AS ujian, s.jenis, s.nilai_kkm AS kkm,
              (SELECT COUNT(DISTINCT ks.user_id)
               FROM "MST_SoalUjianKelas" sk
               JOIN "MST_KelasSiswa" ks ON ks.kelas_id = sk.kelas_id AND ks.tahun_ajaran = ta.tahun_ajaran
               WHERE sk.soal_ujian_id = s.id)::int AS total,
              (SELECT COUNT(*) FROM nilai n WHERE n.soal_ujian_id = s.id)::int AS selesai,
              (SELECT AVG(n.nilai) FROM nilai n WHERE n.soal_ujian_id = s.id)::float8 AS rata_rata
       FROM "MST_SoalUjian" s
       JOIN "MST_TahunAjaran" ta ON ta.id = s.tahun_ajaran_id
       WHERE ${OWNER} AND s.status = 'Siap Ujian'
       ORDER BY s.updated_at DESC
       LIMIT 8`,
      [ownerId]
    )
  },

  // ---------- SISWA ----------
  siswaProfil(userId: string) {
    return queryOne<SiswaProfilRow>(
      `SELECT COALESCE(NULLIF(u.full_name, ''), u.username) AS nama, u.nip_nisn AS nisn,
              k.nama_kelas AS kelas, ta.tahun_ajaran, ta.semester
       FROM "CORE_User" u
       LEFT JOIN "MST_TahunAjaran" ta ON ta.is_active
       LEFT JOIN "MST_KelasSiswa" ks ON ks.user_id = u.id AND ks.tahun_ajaran = ta.tahun_ajaran
       LEFT JOIN "MST_Kelas" k ON k.id = ks.kelas_id
       WHERE u.id = $1
       LIMIT 1`,
      [userId]
    )
  },

  // Semua ujian yang ditujukan ke kelas siswa pada tahun ajaran ujian tersebut
  siswaUjian(userId: string) {
    return query<SiswaUjianRow>(
      `WITH ${NILAI_CTE}
       SELECT s.id, s.nama, m.nama AS mapel, s.jenis, s.nilai_kkm AS kkm, s.durasi_menit,
              COALESCE(tk.is_open AND (tk.expires_at IS NULL OR tk.expires_at > NOW()), FALSE) AS token_open,
              cur.status, cur.status_nilai, n.nilai
       FROM "MST_SoalUjian" s
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       JOIN "MST_TahunAjaran" ta ON ta.id = s.tahun_ajaran_id
       LEFT JOIN "MST_TokenUjian" tk ON tk.soal_ujian_id = s.id AND tk.is_active
       LEFT JOIN LATERAL (
         SELECT p.status, p.status_nilai FROM "TRN_PercobaanUjian" p
         WHERE p.soal_ujian_id = s.id AND p.user_id = $1 AND p.is_active
         ORDER BY p.remedial_ke DESC LIMIT 1
       ) cur ON TRUE
       LEFT JOIN nilai n ON n.soal_ujian_id = s.id AND n.user_id = $1
       WHERE s.is_active AND s.status = 'Siap Ujian'
         AND EXISTS (
           SELECT 1 FROM "MST_SoalUjianKelas" sk
           JOIN "MST_KelasSiswa" ks ON ks.kelas_id = sk.kelas_id
           WHERE sk.soal_ujian_id = s.id AND ks.user_id = $1 AND ks.tahun_ajaran = ta.tahun_ajaran
         )
       ORDER BY s.updated_at DESC`,
      [userId]
    )
  },

  // 10 nilai terakhir siswa (urut waktu naik) untuk grafik perkembangan
  siswaRiwayatNilai(userId: string) {
    return query<RiwayatNilaiRow>(
      `WITH ${NILAI_CTE}
       SELECT * FROM (
         SELECT s.nama AS ujian, m.nama AS mapel, s.jenis, s.nilai_kkm AS kkm,
                n.nilai, n.submitted_at AS tanggal
         FROM nilai n
         JOIN "MST_SoalUjian" s ON s.id = n.soal_ujian_id
         JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
         WHERE n.user_id = $1
         ORDER BY n.submitted_at DESC
         LIMIT 10
       ) x ORDER BY tanggal`,
      [userId]
    )
  },

  siswaNilaiPerMapel(userId: string) {
    return query<NilaiMapelRow>(
      `WITH ${NILAI_CTE}
       SELECT m.nama AS label, AVG(n.nilai)::float8 AS rata_rata, COUNT(*)::int AS jumlah
       FROM nilai n
       JOIN "MST_SoalUjian" s ON s.id = n.soal_ujian_id
       JOIN "MST_MataPelajaran" m ON m.id = s.mapel_id
       WHERE n.user_id = $1
       GROUP BY m.id, m.nama
       ORDER BY rata_rata DESC`,
      [userId]
    )
  },
}
