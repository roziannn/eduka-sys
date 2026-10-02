import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import {
  mataPelajaranService,
  type MataPelajaranPayload,
} from "@/services/mata-pelajaran.service"

export async function GET() {
  try {
    await requireAdmin()
    return ok(await mataPelajaranService.list())
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await readJson<MataPelajaranPayload>(request)
    return ok(await mataPelajaranService.create(body, admin.id), 201)
  } catch (err) {
    return handleError(err)
  }
}