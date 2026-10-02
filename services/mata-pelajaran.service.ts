import { ApiError } from "@/lib/api"
import {
  mataPelajaranRepository,
  type MataPelajaranRecord,
} from "@/repositories/mata-pelajaran.repository"

export type MataPelajaranPayload = {
  kode: string
  nama: string
  kategori: string
  isAktif: boolean
}

const KATEGORI = ["Wajib", "Pilihan", "Muatan Lokal"]

const formatItem = (r: MataPelajaranRecord) => ({
  id: r.id,
  kode: r.kode,
  nama: r.nama,
  kategori: r.kategori,
  isAktif: r.is_active,
  createdAt: new Date(r.created_at).toISOString(),
  createdBy: r.created_by_name ?? "-",
})

function parse(payload: MataPelajaranPayload) {
  const kode = (payload.kode ?? "").trim().toUpperCase()
  const nama = (payload.nama ?? "").trim()

  if (!kode) throw new ApiError(400, "Kode mapel wajib diisi")
  if (kode.length > 20) throw new ApiError(400, "Kode mapel maksimal 20 karakter")
  if (!/^[A-Z0-9_-]+$/.test(kode)) {
    throw new ApiError(400, "Kode hanya boleh huruf, angka, tanda minus, dan garis bawah")
  }
  if (!nama) throw new ApiError(400, "Nama mata pelajaran wajib diisi")
  if (nama.length > 150) throw new ApiError(400, "Nama maksimal 150 karakter")
  if (!KATEGORI.includes(payload.kategori)) {
    throw new ApiError(400, "Kategori tidak valid")
  }

  return {
    kode,
    nama,
    kategori: payload.kategori,
    isActive: Boolean(payload.isAktif),
  }
}

export const mataPelajaranService = {
  async list() {
    return (await mataPelajaranRepository.findAll()).map(formatItem)
  },

  async create(payload: MataPelajaranPayload, userId: string) {
    const id = await mataPelajaranRepository.create(parse(payload), userId)
    return { id }
  },

  async update(id: string, payload: MataPelajaranPayload, userId: string) {
    const updated = await mataPelajaranRepository.update(id, parse(payload), userId)
    if (!updated) throw new ApiError(404, "Data tidak ditemukan")
  },
}