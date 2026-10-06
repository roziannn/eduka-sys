import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireStaff, readJson } from "@/lib/api"
import { soalUjianService, type SoalUjianPayload } from "@/services/soal-ujian.service"

export async function GET() {
  try {
    await requireStaff()
    return ok(await soalUjianService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireStaff()
    const body = await readJson<SoalUjianPayload>(request)
    const created = await soalUjianService.create(body, admin.id)
    await auditTrailService.log(admin, "Add Exam", `Exam "${body.nama}" created`)
    return ok(created, 201)
  } catch (err) {
    return handleError(err)
  }
}