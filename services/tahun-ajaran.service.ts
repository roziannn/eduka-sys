import { ApiError } from "@/lib/api"
import {
  tahunAjaranRepository,
  type TahunAjaranRecord,
} from "@/repositories/tahun-ajaran.repository"

export type TahunAjaranPayload = {
  tahun: string
  semester: string
  isAktif: boolean
}

const SEMESTERS = ["Ganjil", "Genap"]

const formatItem = (r: TahunAjaranRecord) => ({
  id: r.id,
  tahun: r.tahun_ajaran,
  semester: r.semester,
  isAktif: r.is_active,
  createdAt: new Date(r.created_at).toISOString(),
  createdBy: r.created_by_name ?? "-",
})

function parse(payload: TahunAjaranPayload) {
  const tahunAjaran = (payload.tahun ?? "").trim()

  const match = /^(\d{4})\/(\d{4})$/.exec(tahunAjaran)
  if (!match) {
    throw new ApiError(400, "Format tahun ajaran harus seperti 2025/2026")
  }
  if (Number(match[2]) !== Number(match[1]) + 1) {
    throw new ApiError(400, "Tahun akhir harus satu tahun setelah tahun awal")
  }
  if (!SEMESTERS.includes(payload.semester)) {
    throw new ApiError(400, "Semester harus Ganjil atau Genap")
  }

  return {
    tahunAjaran,
    semester: payload.semester,
    isActive: Boolean(payload.isAktif),
  }
}

export const tahunAjaranService = {
  async list() {
    return (await tahunAjaranRepository.findAll()).map(formatItem)
  },

  async create(payload: TahunAjaranPayload, userId: string) {
    const id = await tahunAjaranRepository.create(parse(payload), userId)
    return { id }
  },

  async update(id: string, payload: TahunAjaranPayload, userId: string) {
    const updated = await tahunAjaranRepository.update(id, parse(payload), userId)
    if (!updated) throw new ApiError(404, "Data tidak ditemukan")
  },
}