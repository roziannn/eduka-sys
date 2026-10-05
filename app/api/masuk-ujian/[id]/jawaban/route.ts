import { ok, handleError, requireUser, readJson } from "@/lib/api"
import { masukUjianService } from "@/services/masuk-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Simpan satu jawaban selama ujian berjalan
export async function PUT(request: Request, { params }: Context) {
  try {
    const user = await requireUser()
    const { id } = await params
    await masukUjianService.simpanJawaban(
      id,
      user,
      await readJson<{ soalId?: unknown; jawaban?: unknown }>(request)
    )
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}
