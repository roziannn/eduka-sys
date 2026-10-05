import { ApiError } from "@/lib/api"
import {
  masukUjianRepository,
  type HasilRow,
  type JawabanFinal,
  type JawabanItem,
  type PercobaanRow,
  type UjianByToken,
} from "@/repositories/masuk-ujian.repository"
import type { SoalDb } from "@/types/soal-ujian"

export interface OpsiUjianSiswa {
  id: string
  teks: string
}

// Tanpa kunci jawaban: opsi hanya membawa id dan teks
export interface SoalUjianSiswa {
  id: string
  tipe: "PG" | "ESSAI"
  pertanyaan: string
  bobot: number
  multiJawaban: boolean
  opsi: OpsiUjianSiswa[]
}

export interface UjianSiswa {
  id: string
  nama: string
  mataPelajaran: string
  jenis: string
  tahunAjaran: string
  semester: string
  durasiMenit: number
  soal: SoalUjianSiswa[]
}

export type JawabanSiswa = Record<string, string[] | string>

// Rincian per soal. isBenar null = essai (dinilai guru), nilai null = belum dinilai.
// Kunci jawaban sengaja tidak ikut: siswa hanya tahu benar atau salah.
export interface RincianSoal {
  soalId: string
  tipe: "PG" | "ESSAI"
  bobot: number
  isBenar: boolean | null
  nilai: number | null
}

// Hanya diisi kalau ujian diatur menampilkan hasil
export interface HasilUjian {
  skorPg: number
  skorEssai: number
  skorMaks: number
  adaEssai: boolean
  // Menunggu = masih ada essai yang belum dinilai guru, nilai akhir belum ada
  statusNilai: "Final" | "Menunggu"
  nilaiAkhir: number | null
  // Nilai yang dihitung untuk siswa. Remedial dibatasi paling tinggi KKM.
  nilaiTercatat: number | null
  // Nilai terbaik dari semua percobaan (percobaan awal dan remedial)
  nilaiFinal: number | null
  jenis: "Utama" | "Remedial"
  remedialKe: number
  kkm: number
  tuntas: boolean | null
  rincian: RincianSoal[]
}

export interface PercobaanSiswa {
  id: string
  startedAt: number // jam server (ms)
  deadlineAt: number // jam server (ms)
  status: "Berjalan" | "Selesai"
  order: string[]
  jawaban: JawabanSiswa
  hasil: HasilUjian | null
}

export interface MasukUjianResult {
  userId: string
  // Jam server (ms), supaya timer tidak bergantung pada jam perangkat siswa
  serverNow: number
  ujian: UjianSiswa
  // null = belum pernah mulai
  percobaan: PercobaanSiswa | null
  // Guru sudah mengizinkan remedial dan siswa belum memakainya
  remedialTersedia: { ke: number } | null
}

type Actor = { id: string; role_normalized: string }

const MAX_ESSAI_LENGTH = 20000
// Toleransi keterlambatan (detik) untuk jawaban yang masih di perjalanan saat waktu habis
const GRACE_SIMPAN = 10
const GRACE_KUMPUL = 30
// Token salah yang diizinkan per user sebelum diblokir sementara (jendela waktunya di repository)
const MAX_TOKEN_GAGAL = 5

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function sortedSoal(soal: SoalDb[]) {
  return [...soal].sort((a, b) => a.seq - b.seq)
}

function toSoalSiswa(s: SoalDb): SoalUjianSiswa {
  return {
    id: s.id,
    tipe: s.tipe,
    pertanyaan: s.pertanyaan,
    bobot: s.bobot,
    multiJawaban: !!s.multiJawaban,
    opsi: [...(s.opsi ?? [])]
      .sort((a, b) => a.seq - b.seq)
      .map((o) => ({ id: o.id, teks: o.teks })),
  }
}

// Jawaban dari klien diperiksa terhadap soalnya: opsi harus ada, jumlah sesuai jenis soal
function parseJawaban(soal: SoalDb, raw: unknown): string[] | string {
  if (soal.tipe === "PG") {
    if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
      throw new ApiError(400, "Jawaban pilihan ganda tidak valid")
    }
    const ids = new Set(raw as string[])
    const valid = new Set((soal.opsi ?? []).map((o) => o.id))
    const max = soal.multiJawaban ? valid.size : 1
    if (ids.size !== raw.length || ids.size > max || [...ids].some((id) => !valid.has(id))) {
      throw new ApiError(400, "Jawaban pilihan ganda tidak valid")
    }
    return [...ids]
  }

  if (typeof raw !== "string" || raw.length > MAX_ESSAI_LENGTH) {
    throw new ApiError(400, `Jawaban essai maksimal ${MAX_ESSAI_LENGTH} karakter`)
  }
  return raw
}

// Satu baris nilai per soal. Pilihan ganda benar kalau pilihan siswa persis sama dengan semua
// opsi yang benar (tanpa nilai sebagian). Essai menunggu guru, kecuali dikosongkan: langsung 0.
function nilaiPerSoal(
  soalList: SoalDb[],
  jawaban: Map<string, string[] | string>
): JawabanFinal[] {
  return soalList.map((s): JawabanFinal => {
    const value = jawaban.get(s.id)

    if (s.tipe === "PG") {
      const pilihan = Array.isArray(value) ? value : []
      const kunci = new Set((s.opsi ?? []).filter((o) => o.benar).map((o) => o.id))
      const benar =
        kunci.size > 0 &&
        pilihan.length === kunci.size &&
        pilihan.every((id) => kunci.has(id))
      return {
        soalId: s.id,
        jawaban: pilihan,
        tipe: "PG",
        bobot: s.bobot,
        isBenar: benar,
        nilai: benar ? s.bobot : 0,
      }
    }

    const teks = typeof value === "string" ? value : ""
    return {
      soalId: s.id,
      jawaban: teks,
      tipe: "ESSAI",
      bobot: s.bobot,
      isBenar: null,
      nilai: teks.trim() === "" ? 0 : null,
    }
  })
}

// Token harus berlaku dan ujian sedang dibuka. Siswa hanya bisa ikut ujian untuk kelasnya;
// guru dan admin boleh mencoba.
async function resolveUjian(rawToken: unknown, user: Actor): Promise<UjianByToken> {
  const token = typeof rawToken === "string" ? rawToken.trim().toUpperCase() : ""
  if (!token) throw new ApiError(400, "Token wajib diisi")

  // Terlalu banyak token salah: tolak dulu, supaya token tidak bisa ditebak berulang-ulang
  const gagal = await masukUjianRepository.hitungTokenGagal(user.id)
  if (gagal.jumlah >= MAX_TOKEN_GAGAL) {
    throw new ApiError(
      429,
      `Terlalu banyak token salah. Coba lagi dalam ${gagal.menitTunggu} menit.`
    )
  }

  const ujian = /^[A-Z0-9]{4,12}$/.test(token)
    ? await masukUjianRepository.findByToken(token)
    : null
  if (!ujian) {
    await masukUjianRepository.catatTokenGagal(user.id)
    const sisa = MAX_TOKEN_GAGAL - gagal.jumlah - 1
    throw new ApiError(
      404,
      sisa > 0
        ? `Token tidak ditemukan. Sisa percobaan: ${sisa}.`
        : "Token tidak ditemukan. Percobaan habis, coba lagi beberapa menit lagi."
    )
  }

  if (ujian.status !== "Siap Ujian" || !ujian.is_open) {
    throw new ApiError(403, "Ujian belum dibuka atau sudah ditutup")
  }

  if (user.role_normalized === "STUDENT") {
    const allowed = await masukUjianRepository.isStudentInTargetKelas(
      user.id,
      ujian.id,
      ujian.tahun_ajaran
    )
    if (!allowed) throw new ApiError(403, "Ujian ini bukan untuk kelas Anda")
  }
  return ujian
}

// Menutup percobaan dengan jawaban yang sudah tersimpan (+ jawaban terakhir kalau ada),
// lalu menilai tiap soal. Dipakai saat siswa mengumpulkan dan saat percobaan ditemukan
// sudah lewat batas waktu.
async function tutupPercobaan(
  percobaan: PercobaanRow,
  data: { data_json: { soal: SoalDb[] } },
  extra: JawabanItem[]
) {
  const tersimpan = await masukUjianRepository.findJawaban(percobaan.id)
  for (const item of extra) tersimpan.set(item.soalId, item.jawaban)

  await masukUjianRepository.finalize(
    percobaan.id,
    nilaiPerSoal(sortedSoal(data.data_json.soal), tersimpan)
  )
}

function toRincian(rows: HasilRow[], soalList: SoalDb[]): RincianSoal[] {
  const bySoal = new Map(rows.map((r) => [r.soal_id, r]))
  return sortedSoal(soalList).map((s) => {
    const r = bySoal.get(s.id)
    return {
      soalId: s.id,
      tipe: s.tipe,
      bobot: s.bobot,
      isBenar: r?.is_benar ?? null,
      nilai: r?.nilai ?? null,
    }
  })
}

async function bangunHasil(
  ujianId: string,
  userId: string,
  serverNow: number
): Promise<{ percobaan: PercobaanSiswa | null; serverNow: number }> {
  let row = await masukUjianRepository.findPercobaan(ujianId, userId)
  if (!row) return { percobaan: null, serverNow }

  const data = await masukUjianRepository.findUjianById(ujianId)
  if (!data) throw new ApiError(404, "Ujian tidak ditemukan")

  // Waktu sudah lewat jauh tapi belum pernah dikumpulkan (siswa menutup browser): tutup sekarang
  if (row.status === "Berjalan" && (row.now_ms - row.deadline_ms) / 1000 > GRACE_KUMPUL) {
    await tutupPercobaan(row, data, [])
    row = (await masukUjianRepository.findPercobaan(ujianId, userId)) ?? row
  }

  const jawaban = await masukUjianRepository.findJawaban(row.id)
  const selesai = row.status === "Selesai"
  const adaEssai = data.data_json.soal.some((s) => s.tipe !== "PG")

  let hasil: HasilUjian | null = null
  if (selesai && data.tampilkan_hasil && row.status_nilai) {
    hasil = {
      skorPg: row.skor_pg ?? 0,
      skorEssai: row.skor_essai ?? 0,
      skorMaks: row.skor_maks ?? 0,
      adaEssai,
      statusNilai: row.status_nilai,
      nilaiAkhir: row.nilai_akhir,
      nilaiTercatat: row.nilai_tercatat,
      nilaiFinal: await masukUjianRepository.findNilaiFinal(ujianId, userId),
      jenis: row.jenis,
      remedialKe: row.remedial_ke,
      kkm: data.nilai_kkm,
      tuntas: row.nilai_tercatat === null ? null : row.nilai_tercatat >= data.nilai_kkm,
      rincian: toRincian(await masukUjianRepository.findHasilRows(row.id), data.data_json.soal),
    }
  }

  return {
    serverNow: row.now_ms,
    percobaan: {
      id: row.id,
      startedAt: row.started_ms,
      deadlineAt: row.deadline_ms,
      status: row.status,
      order: row.urutan_soal,
      jawaban: Object.fromEntries(jawaban),
      hasil,
    },
  }
}

async function bangunResponse(
  ujian: UjianByToken,
  user: Actor
): Promise<MasukUjianResult> {
  const { percobaan, serverNow } = await bangunHasil(ujian.id, user.id, Date.now())

  // Izin remedial hanya relevan kalau percobaan terakhir sudah selesai
  const ke =
    percobaan?.status === "Selesai"
      ? await masukUjianRepository.findRemedialTersedia(ujian.id, user.id)
      : null

  return {
    userId: user.id,
    serverNow,
    percobaan,
    remedialTersedia: ke === null ? null : { ke },
    ujian: {
      id: ujian.id,
      nama: ujian.nama,
      mataPelajaran: ujian.mapel_nama,
      jenis: ujian.jenis,
      tahunAjaran: ujian.tahun_ajaran,
      semester: ujian.semester,
      durasiMenit: ujian.durasi_menit,
      soal: sortedSoal(ujian.data_json.soal).map(toSoalSiswa),
    },
  }
}

// Percobaan milik user yang masih berjalan. Selain itu ditolak.
async function requirePercobaanBerjalan(percobaanId: string, user: Actor) {
  if (!UUID_RE.test(percobaanId)) throw new ApiError(404, "Percobaan tidak ditemukan")

  const percobaan = await masukUjianRepository.findPercobaanById(percobaanId, user.id)
  if (!percobaan) throw new ApiError(404, "Percobaan tidak ditemukan")

  const ujian = await masukUjianRepository.findUjianById(percobaan.soal_ujian_id)
  if (!ujian) throw new ApiError(404, "Ujian tidak ditemukan")

  return { percobaan, ujian }
}

export const masukUjianService = {
  // Cek token dan kembalikan soal. Kalau siswa sudah pernah mulai, sertakan keadaannya.
  async enter(rawToken: unknown, user: Actor) {
    return bangunResponse(await resolveUjian(rawToken, user), user)
  },

  // Mulai mengerjakan: waktu mulai dan batas waktu ditetapkan server.
  // - belum pernah mulai: percobaan awal dibuat
  // - sudah mulai: percobaan yang ada dikembalikan apa adanya
  // - percobaan terakhir sudah selesai dan guru mengizinkan remedial: remedial dibuat
  async mulai(rawToken: unknown, user: Actor) {
    const ujian = await resolveUjian(rawToken, user)
    if (ujian.data_json.soal.length === 0) {
      throw new ApiError(400, "Ujian ini belum memiliki butir soal")
    }

    const ids = sortedSoal(ujian.data_json.soal).map((s) => s.id)
    const urutan = ujian.acak_soal ? shuffle(ids) : ids

    const sekarang = await masukUjianRepository.findPercobaan(ujian.id, user.id)
    if (!sekarang) {
      await masukUjianRepository.createPercobaan(ujian.id, user.id, ujian.durasi_menit, urutan)
    } else if (sekarang.status === "Selesai") {
      await masukUjianRepository.createRemedial(ujian.id, user.id, ujian.durasi_menit, urutan)
    }
    return bangunResponse(ujian, user)
  },

  // Simpan satu jawaban (dipanggil tiap siswa memilih atau mengetik)
  async simpanJawaban(
    percobaanId: string,
    user: Actor,
    body: { soalId?: unknown; jawaban?: unknown }
  ) {
    const { percobaan, ujian } = await requirePercobaanBerjalan(percobaanId, user)

    if (percobaan.status !== "Berjalan") {
      throw new ApiError(409, "Ujian sudah dikumpulkan")
    }
    if ((percobaan.now_ms - percobaan.deadline_ms) / 1000 > GRACE_SIMPAN) {
      throw new ApiError(409, "Waktu ujian sudah habis")
    }

    const soal = ujian.data_json.soal.find((s) => s.id === body.soalId)
    if (!soal) throw new ApiError(400, "Soal tidak ditemukan")

    await masukUjianRepository.saveJawaban(percobaan.id, [
      { soalId: soal.id, jawaban: parseJawaban(soal, body.jawaban) },
    ])
  },

  // Kumpulkan dan nilai pilihan ganda. Bisa dipanggil ulang tanpa efek (hasil yang sama).
  // body.jawaban = seluruh jawaban di layar siswa, supaya yang gagal tersimpan tidak hilang.
  async kumpul(percobaanId: string, user: Actor, body: { jawaban?: unknown }) {
    const { percobaan, ujian } = await requirePercobaanBerjalan(percobaanId, user)

    if (percobaan.status === "Berjalan") {
      const extra: JawabanItem[] = []

      // Jawaban yang datang terlalu lama setelah waktu habis diabaikan
      const terlambat = (percobaan.now_ms - percobaan.deadline_ms) / 1000 > GRACE_KUMPUL
      if (!terlambat && body.jawaban !== undefined && body.jawaban !== null) {
        if (typeof body.jawaban !== "object" || Array.isArray(body.jawaban)) {
          throw new ApiError(400, "Format jawaban tidak valid")
        }
        const bySoal = new Map(ujian.data_json.soal.map((s) => [s.id, s]))
        for (const [soalId, raw] of Object.entries(body.jawaban)) {
          const soal = bySoal.get(soalId)
          if (!soal) throw new ApiError(400, "Soal tidak ditemukan")
          extra.push({ soalId, jawaban: parseJawaban(soal, raw) })
        }
      }

      await tutupPercobaan(percobaan, ujian, extra)
    }

    const { percobaan: hasil } = await bangunHasil(
      percobaan.soal_ujian_id,
      user.id,
      Date.now()
    )
    return hasil
  },
}
