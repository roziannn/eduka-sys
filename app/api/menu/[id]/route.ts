import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { menuService, type MenuPayload } from "@/services/menu.service"

type Context = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<MenuPayload>(request)
    await menuService.update(id, body, admin.id)
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}