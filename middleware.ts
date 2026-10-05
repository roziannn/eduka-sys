import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { isPathAllowed, landingUrl } from "@/lib/access"
import type { Session } from "@/lib/auth"

const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
const PUBLIC_PATHS = ["/login", "/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith("/api")
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  const token = request.cookies.get("eduka_session")?.value
  let session: Session | null = null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret)
      // Sesi lama tanpa data akses dianggap tidak berlaku
      if (payload.access) session = payload as unknown as Session
    } catch {}
  }
  const valid = session !== null

  if (!valid && isApi) {
    return NextResponse.json(
      { error: "Sesi berakhir, silakan login ulang" },
      { status: 401 }
    )
  }
  if (!valid && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (session && isPublic) {
    return NextResponse.redirect(new URL(landingUrl(session.access), request.url))
  }

  // Halaman (bukan API) hanya boleh dibuka kalau ada di daftar akses sesi.
  // Tujuan redirect selalu halaman yang diizinkan, jadi tidak bisa berputar.
  if (session && !isApi && !isPathAllowed(session.access, session.role, pathname)) {
    return NextResponse.redirect(new URL(landingUrl(session.access), request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo|.*\\.svg$).*)"],
}