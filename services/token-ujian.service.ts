import { ApiError } from "@/lib/api"
import {
  tokenUjianRepository,
  type TokenState,
} from "@/repositories/token-ujian.repository"

const MAX_EXPIRES_MINUTES = 1440 // 24 jam

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null)

const format = (s: TokenState) => ({
  token: s.token,
  isOpen: s.is_open,
  openedAt: iso(s.opened_at),
  closedAt: iso(s.closed_at),
  expiresAt: iso(s.expires_at),
})

export const tokenUjianService = {
  async get(ujianId: string) {
    const state = await tokenUjianRepository.findState(ujianId)
    if (!state) throw new ApiError(404, "Token ujian tidak ditemukan")
    return format(state)
  },

  async setOpen(
    ujianId: string,
    open: boolean,
    userId: string,
    expiresInMinutes: number | null = null
  ) {
    const state = await tokenUjianRepository.findState(ujianId)
    if (!state) throw new ApiError(404, "Token ujian tidak ditemukan")

    if (open && state.status !== "Siap Ujian") {
      throw new ApiError(400, "Ujian masih Draft. Terbitkan dulu sebelum dibuka.")
    }

    // Batas waktu hanya berlaku saat membuka
    let minutes: number | null = null
    if (open && expiresInMinutes !== null) {
      if (
        !Number.isInteger(expiresInMinutes) ||
        expiresInMinutes < 1 ||
        expiresInMinutes > MAX_EXPIRES_MINUTES
      ) {
        throw new ApiError(
          400,
          `Batas waktu harus bilangan bulat 1 sampai ${MAX_EXPIRES_MINUTES} menit`
        )
      }
      minutes = expiresInMinutes
    }

    const updated = await tokenUjianRepository.setOpen(ujianId, open, userId, minutes)
    if (!updated) throw new ApiError(404, "Token ujian tidak ditemukan")

    return this.get(ujianId)
  },
}