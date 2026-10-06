import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireStaff, readJson, ApiError } from "@/lib/api"
import { soalUjianService } from "@/services/soal-ujian.service"
import { tokenUjianService } from "@/services/token-ujian.service"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireStaff()
    const { id } = await params
    return ok(await tokenUjianService.get(id))
  } catch (err) {
    return handleError(err)
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await requireStaff()
    const { id } = await params
    const body = await readJson<{ open?: unknown; expiresInMinutes?: unknown }>(request)

    if (typeof body.open !== "boolean") {
      throw new ApiError(400, "Field open harus true atau false")
    }

    let expiresInMinutes: number | null = null
    if (body.expiresInMinutes !== undefined && body.expiresInMinutes !== null) {
      if (typeof body.expiresInMinutes !== "number") {
        throw new ApiError(400, "Field expiresInMinutes harus berupa angka")
      }
      expiresInMinutes = body.expiresInMinutes
    }

    const result = await tokenUjianService.setOpen(id, body.open, admin.id, expiresInMinutes)
    const ujian = await soalUjianService.get(id).catch(() => null)
    await auditTrailService.log(
      admin,
      body.open ? "Open Exam Token" : "Close Exam Token",
      `Exam "${ujian?.nama ?? id}"`
    )
    return ok(result)
  } catch (err) {
    return handleError(err)
  }
}