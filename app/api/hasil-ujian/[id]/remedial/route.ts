import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireStaff, readJson } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Guru mengizinkan remedial untuk satu siswa (id = id ujian)
export async function POST(request: Request, { params }: Context) {
  try {
    const staff = await requireStaff()
    const { id } = await params
    const body = await readJson<{ userId?: unknown; catatan?: unknown }>(request)
    await hasilUjianService.beriRemedial(id, body, staff.id)
    await auditTrailService.log(staff, "Grant Remedial", `Exam ${id}, student ${String(body.userId)}`)
    return ok({ id }, 201)
  } catch (err) {
    return handleError(err)
  }
}

// Batalkan izin remedial yang belum dipakai siswa
export async function DELETE(request: Request, { params }: Context) {
  try {
    const staff = await requireStaff()
    const { id } = await params
    const body = await readJson<{ userId?: unknown }>(request)
    await hasilUjianService.batalkanRemedial(id, body)
    await auditTrailService.log(staff, "Cancel Remedial", `Exam ${id}, student ${String(body.userId)}`)
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}
