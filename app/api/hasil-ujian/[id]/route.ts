import { ok, handleError, requireStaff } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Peserta satu ujian (id = id ujian)
export async function GET(_request: Request, { params }: Context) {
  try {
    await requireStaff()
    const { id } = await params
    return ok(await hasilUjianService.peserta(id))
  } catch (err) {
    return handleError(err)
  }
}
