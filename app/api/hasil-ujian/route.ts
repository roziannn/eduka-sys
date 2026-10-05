import { ok, handleError, requireStaff } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

export async function GET() {
  try {
    await requireStaff()
    return ok(await hasilUjianService.list())
  } catch (err) {
    return handleError(err)
  }
}
