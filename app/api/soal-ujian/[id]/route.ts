import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { soalUjianService, type SoalUjianPayload } from "@/services/soal-ujian.service"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireAdmin()
    const { id } = await params
    return ok(await soalUjianService.get(id))
  } catch (err) {
    return handleError(err)
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<SoalUjianPayload>(request)
    await soalUjianService.update(id, body, admin.id)
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}