import { ApiError } from "@/lib/api"
import {
  tokenUjianRepository,
  type TokenState,
} from "@/repositories/token-ujian.repository"

const format = (s: TokenState) => ({
  token: s.token,
  isOpen: s.is_open,
  openedAt: s.opened_at ? new Date(s.opened_at).toISOString() : null,
  closedAt: s.closed_at ? new Date(s.closed_at).toISOString() : null,
})

export const tokenUjianService = {
  async get(ujianId: string) {
    const state = await tokenUjianRepository.findState(ujianId)
    if (!state) throw new ApiError(404, "Token ujian tidak ditemukan")
    return format(state)
  },

  async setOpen(ujianId: string, open: boolean, userId: string) {
    const state = await tokenUjianRepository.findState(ujianId)
    if (!state) throw new ApiError(404, "Token ujian tidak ditemukan")

    if (open && state.status !== "Siap Ujian") {
      throw new ApiError(400, "Ujian masih Draft. Terbitkan dulu sebelum dibuka.")
    }

    const updated = await tokenUjianRepository.setOpen(ujianId, open, userId)
    if (!updated) throw new ApiError(404, "Token ujian tidak ditemukan")

    return this.get(ujianId)
  },
}