import { auditTrailService } from "@/services/audit-trail.service"
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
    const created = await kelasService.create(body, admin.id)
    await auditTrailService.log(admin, "Add Class", `Class "${body.namaKelas}" created`)
    return ok(created, 201)
  } catch (err) {
    return handleError(err)
  }
}