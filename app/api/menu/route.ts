import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { menuService, type MenuPayload } from "@/services/menu.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await menuService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<MenuPayload>(request)
    const created = await menuService.create(body, admin.id)
    await auditTrailService.log(admin, "Add Menu", `Menu "${body.nama}" created`)
    return ok(created, 201)
  } catch (err) {
    return handleError(err)
  }
}