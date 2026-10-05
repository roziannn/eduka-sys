import { ok, handleError, requireStaff } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Lembar jawaban satu siswa (id = id percobaan)
export async function GET(_request: Request, { params }: Context) {
  try {
    await requireStaff()
    const { id } = await params
    return ok(await hasilUjianService.detail(id))
  } catch (err) {
    return handleError(err)
  }
}
