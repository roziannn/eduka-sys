import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { userService, type UserPayload } from "@/services/user.service"

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const tahunAjaran = new URL(request.url).searchParams.get("tahunAjaran")
    return ok(await userService.list(tahunAjaran))
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<UserPayload & { password?: string }>(request)
    return ok(await userService.create(body, admin.id), 201)
  } catch (err) {
    return handleError(err)
  }
}