import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { roleService, type RolePayload } from "@/services/role.service"

type Context = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Context) {
  try {
    await requireAdmin()
    const { id } = await params
    await roleService.update(id, await readJson<RolePayload>(request))
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}