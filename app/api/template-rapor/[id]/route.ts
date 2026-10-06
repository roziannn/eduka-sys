import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import {
  templateRaporService,
  type TemplateRaporPayload,
} from "@/services/template-rapor.service"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireAdmin()
    const { id } = await params
    return ok(await templateRaporService.get(id))
  } catch (err) {
    return handleError(err)
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<TemplateRaporPayload>(request)
    await auditTrailService.logUpdate(
      admin,
      "Edit Report Template",
      `Template "${body.nama}"`,
      () => templateRaporService.get(id),
      () => templateRaporService.update(id, body, admin.id)
    )
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}