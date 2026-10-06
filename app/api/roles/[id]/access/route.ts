import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import {
  roleAccessService,
  type RoleAccessPayload,
} from "@/services/role-access.service"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireAdmin()
    const { id } = await params
    return ok(await roleAccessService.get(id))
  } catch (err) {
    return handleError(err)
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<RoleAccessPayload>(request)
    await auditTrailService.logUpdate(
      admin,
      "Edit Role Access",
      `Role access`,
      async () => (await roleAccessService.get(id)).menus,
      () => roleAccessService.save(id, body, admin.id)
    )
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}
