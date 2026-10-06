import { ok, handleError, requireAdmin } from "@/lib/api"
import { auditTrailService } from "@/services/audit-trail.service"

const PAGE_SIZES = [10, 20, 50, 100]

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const sp = new URL(request.url).searchParams
    const page = Math.max(1, Math.floor(Number(sp.get("page"))) || 1)
    const size = Number(sp.get("pageSize"))
    return ok(
      await auditTrailService.list(
        sp.get("search") ?? "",
        page,
        PAGE_SIZES.includes(size) ? size : 20
      )
    )
  } catch (err) {
    return handleError(err)
  }
}
