import { auditTrailService } from "@/services/audit-trail.service"
import { ok, handleError, requireAdmin, readJson } from "@/lib/api"
import { userService } from "@/services/user.service"
import { userRepository } from "@/repositories/user.repository"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readJson<{ newPassword: string }>(request)
    await userService.resetPassword(id, body.newPassword)
    const target = await userRepository.findById(id)
    await auditTrailService.log(admin, "Reset Password", `Password reset for "${target?.full_name || target?.username || id}"`)
    return ok({ id })
  } catch (err) {
    return handleError(err)
  }
}