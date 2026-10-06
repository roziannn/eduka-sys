import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { roleService, type RolePayload } from "@/services/role.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await roleService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<RolePayload>(request)
    const created = await roleService.create(body)
    await auditTrailService.log(admin, "Add Role", `Role "${body.namaRole}" created`)
    return ok(created, 201)
  } catch (err) {
    return handleError(err)
  }
}