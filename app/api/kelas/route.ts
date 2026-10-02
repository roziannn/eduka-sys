import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { kelasService, type KelasPayload } from "@/services/kelas.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await kelasService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<KelasPayload>(request)
    return ok(await kelasService.create(body, admin.id), 201)
  } catch (err) {
    return handleError(err)
  }
}