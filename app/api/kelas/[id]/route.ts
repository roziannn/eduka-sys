import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { kelasService, type KelasPayload } from "@/services/kelas.service"

type Context = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<KelasPayload>(request)
    await auditTrailService.logUpdate(
      admin,
      "Edit Class",
      `Class "${body.namaKelas}"`,
      async () => (await kelasService.list()).find((x) => x.id === id),
      () => kelasService.update(id, body, admin.id)
    )
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}