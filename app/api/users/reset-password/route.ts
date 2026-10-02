import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { userService } from "@/services/user.service"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Context) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await readJson<{ newPassword: string }>(request)
    await userService.resetPassword(id, body.newPassword)
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}