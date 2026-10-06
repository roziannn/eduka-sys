import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireStaff, readJson } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Guru menilai satu soal essai
export async function PUT(request: Request, { params }: Context) {
  try {
    const staff = await requireStaff()
    const { id } = await params
    const body = await readJson<{ soalId?: unknown; nilai?: unknown; catatan?: unknown }>(request)
    const result = await hasilUjianService.nilaiEssai(id, body, staff.id)
    await auditTrailService.log(staff, "Grade Essay", `Attempt ${id}: score ${String(body.nilai)}`)
    return ok(result)
  } catch (err) {
    return handleError(err)
  }
}
