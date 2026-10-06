import { ok, handleError, requireUser, ApiError } from "@/lib/api"
import { dashboardService } from "@/services/dashboard.service"

// Satu endpoint, isinya mengikuti role pengguna yang login
export async function GET(request: Request) {
  try {
    const user = await requireUser()
    const nama = user.full_name || user.username

    if (user.role_normalized === "ADMIN") {
      const hari = new URL(request.url).searchParams.get("hari")
      return ok(await dashboardService.admin(nama, hari ? Number(hari) : null))
    }
    if (user.role_normalized === "TEACHER") {
      const hari = new URL(request.url).searchParams.get("hari")
      return ok(await dashboardService.guru(user.id, nama, hari ? Number(hari) : null))
    }
    if (user.role_normalized === "STUDENT") {
      return ok(await dashboardService.siswa(user.id))
    }
    throw new ApiError(403, "Anda tidak memiliki akses")
  } catch (err) {
    return handleError(err)
  }
}
