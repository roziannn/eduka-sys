import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { soalUjianService, type SoalUjianPayload } from "@/services/soal-ujian.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await soalUjianService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<SoalUjianPayload>(request)
    return ok(await soalUjianService.create(body, admin.id), 201)
  } catch (err) {
    return handleError(err)
  }
}