import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import {
  mataPelajaranService,
  type MataPelajaranPayload,
} from "@/services/mata-pelajaran.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await mataPelajaranService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<MataPelajaranPayload>(request)
    const created = await mataPelajaranService.create(body, admin.id)
    await auditTrailService.log(admin, "Add Subject", `Subject "${body.nama}" created`)
    return ok(created, 201)
  } catch (err) {
    return handleError(err)
  }
}