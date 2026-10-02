import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import {
  tahunAjaranService,
  type TahunAjaranPayload,
} from "@/services/tahun-ajaran.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await tahunAjaranService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<TahunAjaranPayload>(request)
    return ok(await tahunAjaranService.create(body, admin.id), 201)
  } catch (err) {
    return handleError(err)
  }
}