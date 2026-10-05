import { ok, handleError, requireUser, readJson } from "@/lib/api"
import { masukUjianService } from "@/services/masuk-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Kumpulkan ujian (juga dipanggil otomatis saat waktu habis)
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireUser()
    const { id } = await params
    return ok(
      await masukUjianService.kumpul(id, user, await readJson<{ jawaban?: unknown }>(request))
    )
  } catch (err) {
    return handleError(err)
  }
}
