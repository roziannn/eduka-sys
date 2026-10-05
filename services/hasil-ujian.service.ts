import { ApiError } from "@/lib/api"
import {
  hasilUjianRepository,
  type JawabanDetailRow,
  type PesertaRow,
  type UjianHasilRow,
} from "@/repositories/hasil-ujian.repository"
import type { SoalDb } from "@/types/soal-ujian"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALASAN_RESET = ["remedial", "teknis", "kurang_maksimal"] as const
const MAX_CATATAN = 1000

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null)

const round2 = (n: number) => Math.round(n * 100) / 100

function requireUuid(id: string, pesan: string) {
  if (!UUID_RE.test(id)) throw new ApiError(404, pesan)
}

const formatUjian = (r: UjianHasilRow) => ({
  id: r.id,
  namaUjian: r.nama,
  mataPelajaran: r.mapel_nama,
  jenis: r.jenis,
  status: r.status,
  token: r.token ?? "-",
  tahunAjaran: r.tahun_ajaran,
  semester: r.semester,
  kkm: r.nilai_kkm,
  totalPeserta: r.total_peserta,
  selesai: r.selesai,
  berjalan: r.berjalan,
  menunggu: r.menunggu,
  rataRata: r.rata_rata === null ? null : round2(r.rata_rata),
})

// Status untuk tabel guru:
// Belum Dikerjakan | Sedang Mengerjakan | Menunggu Penilaian | Tuntas | Remedial
function statusPeserta(r: PesertaRow, kkm: number) {
  if (!r.percobaan_id) return "Belum Dikerjakan"
  if (r.status === "Berjalan") return "Sedang Mengerjakan"
  if (r.status_nilai !== "Final" || r.nilai_akhir === null) return "Menunggu Penilaian"
  return r.nilai_akhir >= kkm ? "Tuntas" : "Remedial"
}

export const hasilUjianService = {
  async list() {
    return (await hasilUjianRepository.findUjianList()).map(formatUjian)
  },

  async peserta(ujianId: string) {
    requireUuid(ujianId, "Ujian tidak ditemukan")
    const header = await hasilUjianRepository.findUjianHeader(ujianId)
    if (!header) throw new ApiError(404, "Ujian tidak ditemukan")

    const rows = await hasilUjianRepository.findPeserta(ujianId, header.tahun_ajaran)

    const peserta = rows.map((r) => ({
      userId: r.user_id,
      nama: r.nama,
      nisn: r.nisn ?? "-",
      kelas: r.kelas,
      percobaanId: r.percobaan_id,
      status: statusPeserta(r, header.nilai_kkm),
      nilai: r.nilai_akhir,
      mulai: iso(r.started_at),
      selesai: iso(r.submitted_at),
    }))

    return {
      ujian: {
        id: header.id,
        namaUjian: header.nama,
        mataPelajaran: header.mapel_nama,
        jenis: header.jenis,
        kkm: header.nilai_kkm,
        tahunAjaran: header.tahun_ajaran,
        semester: header.semester,
      },
      kelas: [...new Set(peserta.map((p) => p.kelas))],
      peserta,
    }
  },

  // Lembar jawaban satu siswa, lengkap dengan kunci (guru boleh melihat kunci)
  async detail(percobaanId: string) {
    requireUuid(percobaanId, "Percobaan tidak ditemukan")
    const p = await hasilUjianRepository.findPercobaanDetail(percobaanId)
    if (!p) throw new ApiError(404, "Percobaan tidak ditemukan")

    const jawabanRows = await hasilUjianRepository.findJawabanDetail(p.id)
    const bySoal = new Map<string, JawabanDetailRow>(jawabanRows.map((r) => [r.soal_id, r]))

    const soal = [...p.data_json.soal]
      .sort((a, b) => a.seq - b.seq)
      .map((s: SoalDb, i) => {
        const r = bySoal.get(s.id)
        const dipilih = Array.isArray(r?.jawaban) ? (r!.jawaban as string[]) : []

        return {
          no: i + 1,
          soalId: s.id,
          tipe: s.tipe,
          pertanyaan: s.pertanyaan,
          // Nilai dari snapshot saat dikumpulkan; bobot soal sekarang kalau belum ada barisnya
          bobot: r?.bobot ?? s.bobot,
          isBenar: r?.is_benar ?? null,
          nilai: r?.nilai ?? null,
          catatan: r?.catatan ?? null,
          jawabanEssai: s.tipe === "ESSAI" && typeof r?.jawaban === "string" ? r.jawaban : "",
          opsi: [...(s.opsi ?? [])]
            .sort((a, b) => a.seq - b.seq)
            .map((o) => ({ id: o.id, teks: o.teks, dipilih: dipilih.includes(o.id), benar: o.benar })),
        }
      })

    return {
      id: p.id,
      ujianId: p.soal_ujian_id,
      ujian: p.ujian_nama,
      siswa: { nama: p.nama, nisn: p.nisn ?? "-" },
      status: p.status,
      statusNilai: p.status_nilai,
      isAktif: p.is_active,
      skorPg: p.skor_pg,
      skorEssai: p.skor_essai,
      skorMaks: p.skor_maks,
      nilaiAkhir: p.nilai_akhir,
      kkm: p.nilai_kkm,
      mulai: iso(p.started_at),
      selesai: iso(p.submitted_at),
      soal,
    }
  },

  async nilaiEssai(
    percobaanId: string,
    body: { soalId?: unknown; nilai?: unknown; catatan?: unknown },
    graderId: string
  ) {
    requireUuid(percobaanId, "Percobaan tidak ditemukan")
    if (typeof body.soalId !== "string" || !body.soalId) {
      throw new ApiError(400, "Soal tidak valid")
    }

    const p = await hasilUjianRepository.findPercobaanDetail(percobaanId)
    if (!p) throw new ApiError(404, "Percobaan tidak ditemukan")
    if (!p.is_active) throw new ApiError(409, "Percobaan ini sudah direset")
    if (p.status !== "Selesai") throw new ApiError(409, "Siswa belum mengumpulkan ujian")

    const soal = p.data_json.soal.find((s) => s.id === body.soalId)
    if (!soal || soal.tipe !== "ESSAI") throw new ApiError(400, "Soal essai tidak ditemukan")

    const jawabanRows = await hasilUjianRepository.findJawabanDetail(p.id)
    const bobot = jawabanRows.find((r) => r.soal_id === soal.id)?.bobot ?? soal.bobot

    const nilai = typeof body.nilai === "string" ? Number(body.nilai) : body.nilai
    if (typeof nilai !== "number" || !Number.isFinite(nilai) || nilai < 0 || nilai > bobot) {
      throw new ApiError(400, `Nilai harus angka antara 0 sampai ${bobot}`)
    }
    if (Math.round(nilai * 100) / 100 !== nilai) {
      throw new ApiError(400, "Nilai maksimal dua angka di belakang koma")
    }

    let catatan: string | null = null
    if (body.catatan !== undefined && body.catatan !== null && body.catatan !== "") {
      if (typeof body.catatan !== "string" || body.catatan.length > MAX_CATATAN) {
        throw new ApiError(400, `Catatan maksimal ${MAX_CATATAN} karakter`)
      }
      catatan = body.catatan.trim() || null
    }

    const saved = await hasilUjianRepository.nilaiEssai(p.id, soal.id, nilai, catatan, graderId)
    if (!saved) throw new ApiError(409, "Jawaban essai ini tidak bisa dinilai")

    return this.detail(p.id)
  },

  async reset(percobaanId: string, body: { alasan?: unknown }, actorId: string) {
    requireUuid(percobaanId, "Percobaan tidak ditemukan")
    const alasan = ALASAN_RESET.find((a) => a === body.alasan)
    if (!alasan) throw new ApiError(400, "Alasan ujian ulang tidak valid")

    const done = await hasilUjianRepository.resetPercobaan(percobaanId, alasan, actorId)
    if (!done) throw new ApiError(404, "Percobaan aktif tidak ditemukan")
  },
}
