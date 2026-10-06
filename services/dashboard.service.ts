import { ApiError } from "@/lib/api"
import {
  dashboardRepository as repo,
  type NilaiMapelRow,
  type SiswaUjianRow,
} from "@/repositories/dashboard.repository"

export const RENTANG_TREN = [7, 14, 30] as const
const DEFAULT_TREN = 14

const round1 = (n: number) => Math.round(n * 10) / 10
const nullable = (n: number | null) => (n === null ? null : round1(n))
const persen = (bagian: number, total: number) =>
  total === 0 ? 0 : Math.round((bagian / total) * 100)

const BIN_LABELS = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-100"]

// Isi rentang kosong dengan 0 supaya histogram selalu 10 batang
function lengkapiSebaran(rows: { bin: number; jumlah: number }[]) {
  const byBin = new Map(rows.map((r) => [r.bin, r.jumlah]))
  return BIN_LABELS.map((label, i) => ({ label, value: byBin.get(i) ?? 0 }))
}

const formatNilaiMapel = (rows: NilaiMapelRow[]) =>
  rows.map((r) => ({ label: r.label, value: round1(r.rata_rata), jumlah: r.jumlah }))

function parseHari(hari: number | null) {
  if (hari === null) return DEFAULT_TREN
  if (!(RENTANG_TREN as readonly number[]).includes(hari)) {
    throw new ApiError(400, "Rentang hari tidak valid")
  }
  return hari
}

// Bagian yang sama untuk admin (semua ujian) dan guru (ujian miliknya)
async function dataUjian(ownerId: string | null, hari: number) {
  const [ringkasan, tren, sebaran, mapel, terbaru, perluDinilai] = await Promise.all([
    repo.ujianRingkasan(ownerId),
    repo.trenPengumpulan(ownerId, hari),
    repo.sebaranNilai(ownerId),
    repo.nilaiPerMapel(ownerId),
    repo.ujianTerbaru(ownerId),
    repo.perluDinilai(ownerId),
  ])
  const r = ringkasan!

  return {
    ringkasan: {
      totalUjian: r.total_ujian,
      ujianSiap: r.ujian_siap,
      tokenTerbuka: r.token_terbuka,
      perluDinilai: r.perlu_dinilai,
      rataRata: nullable(r.rata_rata),
      ketuntasan: persen(r.tuntas, r.total_nilai),
      totalNilai: r.total_nilai,
    },
    tren: tren.map((t) => ({ label: t.tanggal, value: t.jumlah })),
    sebaranNilai: lengkapiSebaran(sebaran),
    nilaiPerMapel: formatNilaiMapel(mapel),
    ujianTerbaru: terbaru.map((u) => ({
      id: u.id,
      nama: u.nama,
      mapel: u.mapel,
      jenis: u.jenis,
      status: u.status,
      tokenOpen: u.token_open,
      kelas: u.kelas,
      peserta: u.peserta,
      selesai: u.selesai,
      rataRata: nullable(u.rata_rata),
    })),
    perluDinilai: perluDinilai.map((p) => ({
      ujianId: p.ujian_id,
      ujian: p.ujian,
      mapel: p.mapel,
      jumlah: p.jumlah,
    })),
  }
}

// Status ujian dari sisi siswa
function statusSiswa(u: SiswaUjianRow) {
  if (u.status === "Berjalan") return "Sedang Mengerjakan"
  if (u.status === "Selesai") {
    if (u.status_nilai !== "Final" || u.nilai === null) return "Menunggu Penilaian"
    return u.nilai >= u.kkm ? "Tuntas" : "Belum Tuntas"
  }
  return u.token_open ? "Bisa Dikerjakan" : "Belum Dibuka"
}

export const dashboardService = {
  async admin(nama: string, hariParam: number | null) {
    const hari = parseHari(hariParam)
    const [ringkasan, role, kelas, jenis, ujian] = await Promise.all([
      repo.adminRingkasan(),
      repo.penggunaPerRole(),
      repo.siswaPerKelas(),
      repo.ujianPerJenis(),
      dataUjian(null, hari),
    ])
    const r = ringkasan!

    return {
      role: "ADMIN" as const,
      nama,
      hari,
      stats: {
        siswa: r.siswa,
        guru: r.guru,
        admin: r.admin,
        kelas: r.kelas,
        mapel: r.mapel,
        ujianSiap: r.ujian_siap,
        ujianDraft: r.ujian_draft,
        tokenTerbuka: r.token_terbuka,
        sedangMengerjakan: r.sedang_mengerjakan,
      },
      penggunaPerRole: role.map((x) => ({ label: x.label, value: x.jumlah })),
      siswaPerKelas: kelas.map((k) => ({
        label: k.label,
        value: k.jumlah,
        kapasitas: k.kapasitas,
      })),
      ujianPerJenis: jenis.map((x) => ({ label: x.label, value: x.jumlah })),
      ...ujian,
    }
  },

  async guru(userId: string, nama: string, hariParam: number | null) {
    const hari = parseHari(hariParam)
    const [ujian, partisipasi] = await Promise.all([
      dataUjian(userId, hari),
      repo.partisipasiUjian(userId),
    ])

    return {
      role: "TEACHER" as const,
      nama,
      hari,
      ...ujian,
      partisipasi: partisipasi.map((p) => ({
        ujian: p.ujian,
        jenis: p.jenis,
        total: p.total,
        selesai: p.selesai,
        persen: persen(p.selesai, p.total),
        rataRata: nullable(p.rata_rata),
        kkm: p.kkm,
      })),
    }
  },

  async siswa(userId: string) {
    const [profil, ujian, riwayat, mapel] = await Promise.all([
      repo.siswaProfil(userId),
      repo.siswaUjian(userId),
      repo.siswaRiwayatNilai(userId),
      repo.siswaNilaiPerMapel(userId),
    ])

    const daftar = ujian.map((u) => ({
      id: u.id,
      nama: u.nama,
      mapel: u.mapel,
      jenis: u.jenis,
      kkm: u.kkm,
      durasiMenit: u.durasi_menit,
      nilai: nullable(u.nilai),
      status: statusSiswa(u),
    }))

    const bernilai = ujian.filter((u) => u.nilai !== null)
    const rataRata =
      bernilai.length === 0
        ? null
        : round1(bernilai.reduce((a, u) => a + (u.nilai as number), 0) / bernilai.length)
    const tuntas = bernilai.filter((u) => (u.nilai as number) >= u.kkm).length

    return {
      role: "STUDENT" as const,
      nama: profil?.nama ?? "",
      profil: {
        nisn: profil?.nisn ?? null,
        kelas: profil?.kelas ?? null,
        tahunAjaran: profil?.tahun_ajaran ?? null,
        semester: profil?.semester ?? null,
      },
      stats: {
        totalUjian: daftar.length,
        bisaDikerjakan: daftar.filter((u) => u.status === "Bisa Dikerjakan").length,
        sedangMengerjakan: daftar.filter((u) => u.status === "Sedang Mengerjakan").length,
        menungguPenilaian: daftar.filter((u) => u.status === "Menunggu Penilaian").length,
        selesai: bernilai.length,
        tuntas,
        belumTuntas: bernilai.length - tuntas,
        rataRata,
      },
      // Perlu perhatian lebih dulu: yang bisa/sedang dikerjakan, lalu yang belum tuntas
      ujian: daftar,
      riwayatNilai: riwayat.map((r) => ({
        label: r.ujian,
        mapel: r.mapel,
        jenis: r.jenis,
        value: round1(r.nilai),
        kkm: r.kkm,
        tanggal: new Date(r.tanggal).toISOString(),
      })),
      nilaiPerMapel: formatNilaiMapel(mapel),
    }
  },
}
