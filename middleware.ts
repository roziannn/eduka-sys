import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
const PUBLIC_PATHS = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith("/api")
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  const token = request.cookies.get("eduka_session")?.value
  let valid = false
  if (token) {
    try {
      await jwtVerify(token, secret)
      valid = true
    } catch {}
  }

  if (!valid && isApi) {
    return NextResponse.json(
      { error: "Sesi berakhir, silakan login ulang" },
      { status: 401 }
    )
  }
  if (!valid && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (valid && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo|.*\\.svg$).*)"],
}