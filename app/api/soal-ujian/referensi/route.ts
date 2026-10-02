import { ok, handleError, requireAdmin } from "@/lib/api"
import { soalUjianService } from "@/services/soal-ujian.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await soalUjianService.referensi())
  } catch (err) {
    return handleError(err)
  }
}