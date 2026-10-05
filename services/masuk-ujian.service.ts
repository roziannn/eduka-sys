import { ApiError } from "@/lib/api"
import {
  masukUjianRepository,
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

// Hanya diisi kalau ujian diatur menampilkan hasil
export interface HasilUjian {
  skorPg: number
  skorMaks: number
  adaEssai: boolean
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
}

type Actor = { id: string; role_normalized: string }

const MAX_ESSAI_LENGTH = 20000
// Toleransi keterlambatan (detik) untuk jawaban yang masih di perjalanan saat waktu habis
const GRACE_SIMPAN = 10
const GRACE_KUMPUL = 30

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

// Pilihan ganda benar kalau pilihan siswa persis sama dengan semua opsi yang benar (tanpa nilai sebagian)
function hitungSkor(soalList: SoalDb[], jawaban: Map<string, string[] | string>) {
  let skorPg = 0
  let skorMaks = 0
  let adaEssai = false

  for (const s of soalList) {
    skorMaks += s.bobot
    if (s.tipe !== "PG") {
      adaEssai = true
      continue
    }
    const kunci = new Set((s.opsi ?? []).filter((o) => o.benar).map((o) => o.id))
    const pilihan = jawaban.get(s.id)
    if (
      kunci.size > 0 &&
      Array.isArray(pilihan) &&
      pilihan.length === kunci.size &&
      pilihan.every((id) => kunci.has(id))
    ) {
      skorPg += s.bobot
    }
  }
  return { skorPg, skorMaks, adaEssai }
}

// Token harus berlaku dan ujian sedang dibuka. Siswa hanya bisa ikut ujian untuk kelasnya;
// guru dan admin boleh mencoba.
async function resolveUjian(rawToken: unknown, user: Actor): Promise<UjianByToken> {
  const token = typeof rawToken === "string" ? rawToken.trim().toUpperCase() : ""
  if (!token) throw new ApiError(400, "Token wajib diisi")
  if (!/^[A-Z0-9]{4,12}$/.test(token)) throw new ApiError(404, "Token tidak ditemukan")

  const ujian = await masukUjianRepository.findByToken(token)
  if (!ujian) throw new ApiError(404, "Token tidak ditemukan")

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

// Menutup percobaan dengan jawaban yang sudah tersimpan (+ jawaban terakhir kalau ada).
// Dipakai saat siswa mengumpulkan dan saat percobaan ditemukan sudah lewat batas waktu.
async function tutupPercobaan(
  percobaan: PercobaanRow,
  data: { data_json: { soal: SoalDb[] } },
  extra: JawabanItem[]
) {
  const tersimpan = await masukUjianRepository.findJawaban(percobaan.id)
  for (const item of extra) tersimpan.set(item.soalId, item.jawaban)

  const { skorPg, skorMaks } = hitungSkor(data.data_json.soal, tersimpan)
  await masukUjianRepository.finalize(percobaan.id, extra, skorPg, skorMaks)
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

  return {
    serverNow: row.now_ms,
    percobaan: {
      id: row.id,
      startedAt: row.started_ms,
      deadlineAt: row.deadline_ms,
      status: row.status,
      order: row.urutan_soal,
      jawaban: Object.fromEntries(jawaban),
      hasil:
        selesai && data.tampilkan_hasil && row.skor_pg !== null && row.skor_maks !== null
          ? { skorPg: row.skor_pg, skorMaks: row.skor_maks, adaEssai }
          : null,
    },
  }
}

async function bangunResponse(
  ujian: UjianByToken,
  user: Actor
): Promise<MasukUjianResult> {
  const { percobaan, serverNow } = await bangunHasil(ujian.id, user.id, Date.now())

  return {
    userId: user.id,
    serverNow,
    percobaan,
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
  // Kalau sudah pernah mulai, percobaan yang ada dikembalikan apa adanya.
  async mulai(rawToken: unknown, user: Actor) {
    const ujian = await resolveUjian(rawToken, user)
    if (ujian.data_json.soal.length === 0) {
      throw new ApiError(400, "Ujian ini belum memiliki butir soal")
    }

    const ids = sortedSoal(ujian.data_json.soal).map((s) => s.id)
    await masukUjianRepository.createPercobaan(
      ujian.id,
      user.id,
      ujian.durasi_menit,
      ujian.acak_soal ? shuffle(ids) : ids
    )
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
