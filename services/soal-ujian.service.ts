import { ApiError } from "@/lib/api"
import { sanitizeQuestionHtml } from "@/lib/sanitize-rich-text"
import {
  soalUjianRepository,
  type SoalUjianInput,
  type SoalUjianListRecord,
} from "@/repositories/soal-ujian.repository"
import {
  JENIS_UJIAN,
  STATUS_UJIAN,
  type JenisUjian,
  type OpsiDb,
  type ReferensiUjian,
  type SoalDb,
  type StatusUjian,
  type TipeSoal,
  type UjianDetail,
} from "@/types/soal-ujian"

export type SoalUjianPayload = {
  nama: string
  mapelId: string
  jenis: string
  tahunAjaran: string
  semester: string
  kelasIds: string[]
  durasiMenit: number
  kkm: number
  acakSoal: boolean
  tampilkanHasil: boolean
  status: string
  soal: unknown
}

const MAX_SOAL = 200
const MIN_OPSI = 2
const MAX_OPSI = 10
const MAX_KELAS = 100
const MAX_BOBOT = 1000
const MAX_OPSI_TEXT = 1000
// Gambar di dalam pertanyaan disimpan sebagai base64, jadi batasnya longgar
const MAX_PERTANYAAN_LENGTH = 3_000_000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const plainText = (html: string) =>
  html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()

function parseIntInRange(value: unknown, min: number, max: number, message: string) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw new ApiError(400, message)
  return n
}

// published = true: aturan ketat (Terbitkan). false: longgar (Draft), isi boleh belum lengkap.
function parseSoal(raw: unknown, published: boolean): SoalDb[] {
  if (!Array.isArray(raw)) throw new ApiError(400, "Daftar soal tidak valid")
  if (raw.length > MAX_SOAL) throw new ApiError(400, `Soal maksimal ${MAX_SOAL} butir`)
  if (published && raw.length === 0) {
    throw new ApiError(400, "Ujian harus memiliki minimal 1 butir soal")
  }

  const soalIds = new Set<string>()

  return raw.map((item: unknown, index: number): SoalDb => {
    const no = index + 1
    if (!isPlainObject(item)) throw new ApiError(400, `Soal nomor ${no} tidak valid`)

    const id = typeof item.id === "string" ? item.id.trim() : ""
    if (!id || id.length > 50 || soalIds.has(id)) {
      throw new ApiError(400, `ID soal nomor ${no} tidak valid`)
    }
    soalIds.add(id)

    if (item.tipe !== "PG" && item.tipe !== "ESSAI") {
      throw new ApiError(400, `Tipe soal nomor ${no} tidak valid`)
    }
    const tipe = item.tipe as TipeSoal

    const pertanyaanRaw = typeof item.pertanyaan === "string" ? item.pertanyaan : ""
    if (pertanyaanRaw.length > MAX_PERTANYAAN_LENGTH) {
      throw new ApiError(400, `Pertanyaan soal nomor ${no} terlalu besar`)
    }
    const pertanyaan = sanitizeQuestionHtml(pertanyaanRaw)

    const bobot = Number(item.bobot)
    if (!Number.isFinite(bobot) || bobot < 0 || bobot > MAX_BOBOT) {
      throw new ApiError(400, `Bobot soal nomor ${no} harus 0 sampai ${MAX_BOBOT}`)
    }

    if (published) {
      if (!plainText(pertanyaan)) {
        throw new ApiError(400, `Pertanyaan soal nomor ${no} tidak boleh kosong`)
      }
      if (bobot < 1) throw new ApiError(400, `Bobot soal nomor ${no} minimal 1`)
    }

    const base = { id, seq: no, tipe, pertanyaan, bobot }
    if (tipe === "ESSAI") return base

    // ----- Pilihan Ganda -----
    const multiJawaban = item.multiJawaban === true

    if (
      !Array.isArray(item.opsi) ||
      item.opsi.length < MIN_OPSI ||
      item.opsi.length > MAX_OPSI
    ) {
      throw new ApiError(
        400,
        `Soal nomor ${no} harus memiliki ${MIN_OPSI} sampai ${MAX_OPSI} opsi jawaban`
      )
    }

    const opsiIds = new Set<string>()
    const opsi: OpsiDb[] = item.opsi.map((o: unknown, i: number): OpsiDb => {
      const label = String.fromCharCode(65 + i)
      if (!isPlainObject(o)) {
        throw new ApiError(400, `Opsi ${label} soal nomor ${no} tidak valid`)
      }

      const oid = typeof o.id === "string" ? o.id.trim() : ""
      if (!oid || oid.length > 50 || opsiIds.has(oid)) {
        throw new ApiError(400, `ID opsi ${label} soal nomor ${no} tidak valid`)
      }
      opsiIds.add(oid)

      const teks = typeof o.teks === "string" ? o.teks.trim() : ""
      if (teks.length > MAX_OPSI_TEXT) {
        throw new ApiError(400, `Opsi ${label} soal nomor ${no} terlalu panjang`)
      }
      if (published && !teks) {
        throw new ApiError(400, `Opsi ${label} soal nomor ${no} wajib diisi`)
      }

      return { id: oid, seq: i + 1, teks, benar: o.benar === true }
    })

    const jumlahBenar = opsi.filter((o) => o.benar).length
    if (published && jumlahBenar === 0) {
      throw new ApiError(400, `Soal nomor ${no} belum memiliki kunci jawaban`)
    }
    if (!multiJawaban && jumlahBenar > 1) {
      throw new ApiError(400, `Soal nomor ${no} hanya boleh memiliki satu kunci jawaban`)
    }

    return { ...base, multiJawaban, opsi }
  })
}

function parse(payload: SoalUjianPayload) {
  const status = payload.status as StatusUjian
  if (!STATUS_UJIAN.includes(status)) throw new ApiError(400, "Status ujian tidak valid")
  const published = status === "Siap Ujian"

  const nama = typeof payload.nama === "string" ? payload.nama.trim() : ""
  if (!nama) throw new ApiError(400, "Nama ujian wajib diisi")
  if (nama.length > 150) throw new ApiError(400, "Nama ujian maksimal 150 karakter")

  if (typeof payload.mapelId !== "string" || !UUID_RE.test(payload.mapelId)) {
    throw new ApiError(400, "Mata pelajaran wajib dipilih")
  }

  if (!JENIS_UJIAN.includes(payload.jenis as JenisUjian)) {
    throw new ApiError(400, "Jenis ujian tidak valid")
  }

  const tahunAjaran = typeof payload.tahunAjaran === "string" ? payload.tahunAjaran.trim() : ""
  const semester = typeof payload.semester === "string" ? payload.semester.trim() : ""
  if (!tahunAjaran || !semester) {
    throw new ApiError(400, "Tahun ajaran dan semester wajib dipilih")
  }

  const durasiMenit = parseIntInRange(payload.durasiMenit, 1, 600, "Durasi harus 1 sampai 600 menit")
  const kkm = parseIntInRange(payload.kkm, 0, 100, "Nilai KKM harus 0 sampai 100")

  const rawKelas = Array.isArray(payload.kelasIds) ? payload.kelasIds : []
  if (rawKelas.length > MAX_KELAS) throw new ApiError(400, "Distribusi kelas terlalu banyak")
  const kelasIds = Array.from(new Set(rawKelas.map(String)))
  if (kelasIds.some((id) => !UUID_RE.test(id))) {
    throw new ApiError(400, "Distribusi kelas tidak valid")
  }
  if (published && kelasIds.length === 0) {
    throw new ApiError(400, "Pilih minimal 1 distribusi kelas")
  }

  return {
    nama,
    mapelId: payload.mapelId,
    jenis: payload.jenis,
    tahunAjaran,
    semester,
    durasiMenit,
    kkm,
    acakSoal: payload.acakSoal === true,
    tampilkanHasil: payload.tampilkanHasil === true,
    status,
    kelasIds,
    soal: parseSoal(payload.soal, published),
  }
}

async function toRepositoryInput(payload: SoalUjianPayload): Promise<SoalUjianInput> {
  const parsed = parse(payload)

  const tahunAjaranId = await soalUjianRepository.findTahunAjaranId(
    parsed.tahunAjaran,
    parsed.semester
  )
  if (!tahunAjaranId) {
    throw new ApiError(400, "Periode tahun ajaran dan semester tersebut tidak ditemukan")
  }

  return {
    nama: parsed.nama,
    mapelId: parsed.mapelId,
    jenis: parsed.jenis,
    tahunAjaranId,
    durasiMenit: parsed.durasiMenit,
    kkm: parsed.kkm,
    acakSoal: parsed.acakSoal,
    tampilkanHasil: parsed.tampilkanHasil,
    status: parsed.status,
    kelasIds: parsed.kelasIds,
    dataJson: { schemaVersion: 1, soal: parsed.soal },
  }
}

const formatListItem = (r: SoalUjianListRecord) => ({
  id: r.id,
  nama: r.nama,
  jenis: r.jenis,
  status: r.status,
  mapel: r.mapel_nama,
  tahunAjaran: r.tahun_ajaran,
  semester: r.semester,
  durasiMenit: r.durasi_menit,
  kkm: r.nilai_kkm,
  jumlahSoal: r.jumlah_soal,
  totalBobot: r.total_bobot,
  kelas: r.kelas,
  token: r.token,
  tokenOpen: r.token_open,
  tokenExpiresAt: r.token_expires_at ? new Date(r.token_expires_at).toISOString() : null,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
  createdBy: r.created_by_name ?? "-",
})

export const soalUjianService = {
  async referensi(): Promise<ReferensiUjian> {
    const r = await soalUjianRepository.findReferensi()
    return {
      mapel: r.mapel.map((m) => ({
        id: m.id,
        kode: m.kode,
        nama: m.nama,
        isAktif: m.is_active,
      })),
      kelas: r.kelas.map((k) => ({
        id: k.id,
        namaKelas: k.nama_kelas,
        tingkat: k.tingkat,
        jurusan: k.jurusan ?? "",
        isAktif: k.is_active,
      })),
      tahunAjaran: r.tahunAjaran.map((t) => ({
        id: t.id,
        tahun: t.tahun_ajaran,
        semester: t.semester,
        isAktif: t.is_active,
      })),
    }
  },

  async list() {
    return (await soalUjianRepository.findAll()).map(formatListItem)
  },

  async get(id: string): Promise<UjianDetail> {
    const r = await soalUjianRepository.findById(id)
    if (!r) throw new ApiError(404, "Ujian tidak ditemukan")

    return {
      id: r.id,
      nama: r.nama,
      mapelId: r.mapel_id,
      jenis: r.jenis as JenisUjian,
      tahunAjaran: r.tahun_ajaran,
      semester: r.semester,
      kelasIds: r.kelas_ids,
      durasiMenit: r.durasi_menit,
      kkm: r.nilai_kkm,
      acakSoal: r.acak_soal,
      tampilkanHasil: r.tampilkan_hasil,
      status: r.status as StatusUjian,
      soal: r.data_json.soal ?? [],
    }
  },

  async create(payload: SoalUjianPayload, userId: string) {
    const id = await soalUjianRepository.create(await toRepositoryInput(payload), userId)
    return { id }
  },

  async update(id: string, payload: SoalUjianPayload, userId: string) {
    const updated = await soalUjianRepository.update(
      id,
      await toRepositoryInput(payload),
      userId
    )
    if (!updated) throw new ApiError(404, "Ujian tidak ditemukan")
  },
}