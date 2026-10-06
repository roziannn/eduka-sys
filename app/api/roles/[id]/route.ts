import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { roleService, type RolePayload } from "@/services/role.service"

type Context = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<RolePayload>(request)
    await auditTrailService.logUpdate(
      admin,
      "Edit Role",
      `Role "${body.namaRole}"`,
      async () => (await roleService.list()).find((r) => r.id === id),
      () => roleService.update(id, body)
    )
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}