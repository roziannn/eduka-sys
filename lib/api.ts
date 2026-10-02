import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { userRepository } from "@/repositories/user.repository"

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const UNIQUE_MESSAGES: Record<string, string> = {
  email: "Email sudah terdaftar",
  username: "Username sudah dipakai",
  role: "Nama role sudah ada",
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session) {
    throw new ApiError(401, "Sesi berakhir, silakan login ulang")
  }

  const user = await userRepository.findById(session.userId)
  if (!user || !user.is_active) {
    throw new ApiError(401, "Sesi berakhir, silakan login ulang")
  }
  if (user.role_normalized !== "ADMIN") {
    throw new ApiError(403, "Anda tidak memiliki akses")
  }

  return user
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new ApiError(400, "Body request tidak valid")
  }
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }

  const e = err as { code?: string; constraint?: string }
  if (e?.code === "23505") {
    const key = Object.keys(UNIQUE_MESSAGES).find((k) =>
      e.constraint?.includes(k)
    )
    return NextResponse.json(
      { error: key ? UNIQUE_MESSAGES[key] : "Data sudah ada" },
      { status: 409 }
    )
  }

  console.error(err)
  return NextResponse.json(
    { error: "Terjadi kesalahan pada server" },
    { status: 500 }
  )
}