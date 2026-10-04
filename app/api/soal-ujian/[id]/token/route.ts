import { ok, handleError, requireAdmin, readJson, ApiError } from "@/lib/api"
import { tokenUjianService } from "@/services/token-ujian.service"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireAdmin()
    const { id } = await params
    return ok(await tokenUjianService.get(id))
  } catch (err) {
    return handleError(err)
  }
}

// Body: { "open": true } untuk membuka, { "open": false } untuk menutup
export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<{ open?: unknown }>(request)

    if (typeof body.open !== "boolean") {
      throw new ApiError(400, "Field open harus true atau false")
    }

    return ok(await tokenUjianService.setOpen(id, body.open, admin.id))
  } catch (err) {
    return handleError(err)
  }
}