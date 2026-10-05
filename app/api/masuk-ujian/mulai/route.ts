import { ok, handleError, requireUser, readJson } from "@/lib/api"
import { masukUjianService } from "@/services/masuk-ujian.service"

// Siswa menekan Mulai: waktu mulai dan batas waktu dicatat di server
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await readJson<{ token?: unknown }>(request)
    return ok(await masukUjianService.mulai(body.token, user))
  } catch (err) {
    return handleError(err)
  }
}
