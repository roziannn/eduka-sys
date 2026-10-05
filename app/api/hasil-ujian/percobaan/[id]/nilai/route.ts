import { ok, handleError, requireStaff, readJson } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Guru menilai satu soal essai
export async function PUT(request: Request, { params }: Context) {
  try {
    const staff = await requireStaff()
    const { id } = await params
    return ok(
      await hasilUjianService.nilaiEssai(
        id,
        await readJson<{ soalId?: unknown; nilai?: unknown; catatan?: unknown }>(request),
        staff.id
      )
    )
  } catch (err) {
    return handleError(err)
  }
}
