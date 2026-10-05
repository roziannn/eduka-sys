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
    await roleAccessService.save(
      id,
      await readJson<RoleAccessPayload>(request),
      admin.id
    )
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}
