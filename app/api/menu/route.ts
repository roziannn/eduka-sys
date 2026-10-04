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
    return ok(await menuService.create(body, admin.id), 201)
  } catch (err) {
    return handleError(err)
  }
}