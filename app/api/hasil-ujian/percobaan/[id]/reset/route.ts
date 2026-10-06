import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireStaff, readJson } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Ujian ulang: percobaan lama jadi riwayat, siswa bisa memulai lagi
export async function POST(request: Request, { params }: Context) {
  try {
    const staff = await requireStaff()
    const { id } = await params
    const body = await readJson<{ alasan?: unknown }>(request)
    await hasilUjianService.reset(id, body, staff.id)
    await auditTrailService.log(staff, "Reset Exam Attempt", `Attempt ${id}, reason: ${String(body.alasan)}`)
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}
