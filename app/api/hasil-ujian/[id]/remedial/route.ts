import { ok, handleError, requireStaff, readJson } from "@/lib/api"
import { hasilUjianService } from "@/services/hasil-ujian.service"

type Context = { params: Promise<{ id: string }> }

// Guru mengizinkan remedial untuk satu siswa (id = id ujian)
export async function POST(request: Request, { params }: Context) {
  try {
    const staff = await requireStaff()
    const { id } = await params
    await hasilUjianService.beriRemedial(
      id,
      await readJson<{ userId?: unknown; catatan?: unknown }>(request),
      staff.id
    )
    return ok({ id }, 201)
  } catch (err) {
    return handleError(err)
  }
}

// Batalkan izin remedial yang belum dipakai siswa
export async function DELETE(request: Request, { params }: Context) {
  try {
    await requireStaff()
    const { id } = await params
    await hasilUjianService.batalkanRemedial(id, await readJson<{ userId?: unknown }>(request))
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}
