import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { userService, type UserPayload } from "@/services/user.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await userService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await readJson<UserPayload & { password?: string }>(request)
    return ok(await userService.create(body), 201)
  } catch (err) {
    return handleError(err)
  }
}