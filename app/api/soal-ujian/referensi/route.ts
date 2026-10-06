import { ok, handleError, requireStaff } from "@/lib/api"
import { soalUjianService } from "@/services/soal-ujian.service"

export async function GET() {
  try {
    await requireStaff()
    return ok(await soalUjianService.referensi())
  } catch (err) {
    return handleError(err)
  }
}