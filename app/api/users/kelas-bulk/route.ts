import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { userService, type BulkKelasPayload } from "@/services/user.service"

// Body: { "tahunAjaran": "2026/2027", "assignments": [{ "userId": "...", "kelasId": "..." | null }] }
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<BulkKelasPayload>(request)
    const result = await userService.bulkKelas(body, admin.id)
    // Tidak ada siswa yang pindah atau dicabut = tidak ada perubahan
    if (result.moved > 0 || result.removed > 0) {
      await auditTrailService.log(
        admin,
        "Assign Class (Bulk)",
        `Academic year ${body.tahunAjaran}: ${result.moved} moved, ${result.removed} removed`
      )
    }
    return ok(result)
  } catch (err) {
    return handleError(err)
  }
}