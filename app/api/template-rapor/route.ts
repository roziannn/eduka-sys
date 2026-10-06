import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import {
  templateRaporService,
  type TemplateRaporPayload,
} from "@/services/template-rapor.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await templateRaporService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<TemplateRaporPayload>(request)
    const created = await templateRaporService.create(body, admin.id)
    await auditTrailService.log(admin, "Add Report Template", `Template "${body.nama}" created`)
    return ok(created, 201)
  } catch (err) {
    return handleError(err)
  }
}