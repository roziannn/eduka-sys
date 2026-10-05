import { ok, handleError, requireStaff, readJson } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Ujian ulang: percobaan lama jadi riwayat, siswa bisa memulai lagi
export async function POST(request: Request, { params }: Context) {
  try {
    const staff = await requireStaff()
    const { id } = await params
    await hasilUjianService.reset(id, await readJson<{ alasan?: unknown }>(request), staff.id)
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}
