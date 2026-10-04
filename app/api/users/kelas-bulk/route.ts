import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { userService, type BulkKelasPayload } from "@/services/user.service"

// Body: { "tahunAjaran": "2026/2027", "assignments": [{ "userId": "...", "kelasId": "..." | null }] }
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<BulkKelasPayload>(request)
    return ok(await userService.bulkKelas(body, admin.id))
  } catch (err) {
    return handleError(err)
  }
}