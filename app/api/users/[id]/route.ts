import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { userService, type UserPayload } from "@/services/user.service"

type Context = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Context) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await readJson<UserPayload>(request)
    await userService.update(id, body)
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}