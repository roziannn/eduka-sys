import { ok, handleError, requireUser, readJson } from "@/lib/api"
import { masukUjianService } from "@/services/masuk-ujian.service"

// Siswa memasukkan token, server mengembalikan soal tanpa kunci jawaban
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await readJson<{ token?: unknown }>(request)
    return ok(await masukUjianService.enter(body.token, user))
  } catch (err) {
    return handleError(err)
  }
}
