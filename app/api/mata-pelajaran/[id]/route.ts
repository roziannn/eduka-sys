import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import {
  mataPelajaranService,
  type MataPelajaranPayload,
} from "@/services/mata-pelajaran.service"

type Context = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<MataPelajaranPayload>(request)
    await auditTrailService.logUpdate(
      admin,
      "Edit Subject",
      `Subject "${body.nama}"`,
      async () => (await mataPelajaranService.list()).find((x) => x.id === id),
      () => mataPelajaranService.update(id, body, admin.id)
    )
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}