import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import {
  tahunAjaranService,
  type TahunAjaranPayload,
} from "@/services/tahun-ajaran.service"

type Context = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<TahunAjaranPayload>(request)
    await auditTrailService.logUpdate(
      admin,
      "Edit Academic Year",
      `Academic year "${`${body.tahun} ${body.semester}`}"`,
      async () => (await tahunAjaranService.list()).find((x) => x.id === id),
      () => tahunAjaranService.update(id, body, admin.id)
    )
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}