import { ApiError } from "@/lib/api"
import {
  kelasRepository,
  type KelasRecord,
} from "@/repositories/kelas.repository"

export type KelasPayload = {
  namaKelas: string
  tingkat: string
  jurusan: string
  kapasitas: number
  isAktif: boolean
}

const TINGKAT = ["10", "11", "12"]
const MAX_KAPASITAS = 200

const formatItem = (r: KelasRecord) => ({
  id: r.id,
  namaKelas: r.nama_kelas,
  tingkat: r.tingkat,
  jurusan: r.jurusan ?? "",
  kapasitas: r.kapasitas,
  isAktif: r.is_active,
  createdAt: new Date(r.created_at).toISOString(),
  createdBy: r.created_by_name ?? "-",
})

function parse(payload: KelasPayload) {
  const namaKelas = (payload.namaKelas ?? "").trim()
  const jurusan = (payload.jurusan ?? "").trim()
  const kapasitas = Number(payload.kapasitas)

  if (!namaKelas) throw new ApiError(400, "Nama kelas wajib diisi")
  if (namaKelas.length > 50) throw new ApiError(400, "Nama kelas maksimal 50 karakter")
  if (!TINGKAT.includes(payload.tingkat)) throw new ApiError(400, "Tingkat tidak valid")
  if (jurusan.length > 50) throw new ApiError(400, "Jurusan maksimal 50 karakter")
  if (!Number.isInteger(kapasitas) || kapasitas < 1 || kapasitas > MAX_KAPASITAS) {
    throw new ApiError(400, `Kapasitas harus bilangan bulat 1 sampai ${MAX_KAPASITAS}`)
  }

  return {
    namaKelas,
    tingkat: payload.tingkat,
    jurusan: jurusan || null,
    kapasitas,
    isActive: Boolean(payload.isAktif),
  }
}

export const kelasService = {
  async list() {
    return (await kelasRepository.findAll()).map(formatItem)
  },

  async create(payload: KelasPayload, userId: string) {
    const id = await kelasRepository.create(parse(payload), userId)
    return { id }
  },

  async update(id: string, payload: KelasPayload, userId: string) {
    const updated = await kelasRepository.update(id, parse(payload), userId)
    if (!updated) throw new ApiError(404, "Data tidak ditemukan")
  },
}