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
    await requireAdmin()
    return ok(await roleService.create(await readJson<RolePayload>(request)), 201)
  } catch (err) {
    return handleError(err)
  }
}