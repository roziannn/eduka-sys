import { ok, handleError, requireStaff, readJson } from "@/lib/api"
import { soalUjianService, type SoalUjianPayload } from "@/services/soal-ujian.service"

export async function GET() {
  try {
    await requireStaff()
    return ok(await soalUjianService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireStaff()
    const body = await readJson<SoalUjianPayload>(request)
    return ok(await soalUjianService.create(body, admin.id), 201)
  } catch (err) {
    return handleError(err)
  }
}