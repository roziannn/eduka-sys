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
  periode: "Periode tahun ajaran dan semester tersebut sudah ada",
  kode: "Kode mata pelajaran sudah dipakai",
  kelas: "Nama kelas sudah dipakai",
  templaterapor: "Nama template sudah dipakai",
  soalujian: "Nama ujian sudah dipakai pada tahun ajaran tersebut",
  core_menu_name_main: "Nama menu utama sudah dipakai",
  core_menu_name_sub: "Nama sub menu sudah dipakai di menu induk ini",
  core_menu_url: "URL rute sudah dipakai menu lain",
  core_menufunction: "Kode button sudah dipakai di menu ini",
}

// Semua user aktif yang sudah login boleh lewat
export async function requireUser() {
  const session = await getSession()
  if (!session) {
    throw new ApiError(401, "Sesi berakhir, silakan login ulang")
  }

  const user = await userRepository.findById(session.userId)
  if (!user || !user.is_active) {
    throw new ApiError(401, "Sesi berakhir, silakan login ulang")
  }
  return user
}

// Admin dan guru yang aktif (mengelola hasil ujian)
export async function requireStaff() {
  const user = await requireUser()
  if (user.role_normalized !== "ADMIN" && user.role_normalized !== "TEACHER") {
    throw new ApiError(403, "Anda tidak memiliki akses")
  }
  return user
}

// Hanya user ADMIN yang aktif yang boleh lewat
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

  // Foreign key: data referensi tidak ada atau masih dipakai
  if (e?.code === "23503") {
    return NextResponse.json(
      {
        error:
          "Data berkaitan dengan data lain (mapel, kelas, atau tahun ajaran) yang tidak ditemukan atau masih dipakai",
      },
      { status: 409 }
    )
  }

  // ID di URL bukan UUID yang valid
  if (e?.code === "22P02") {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 }
    )
  }

  console.error(err)
  return NextResponse.json(
    { error: "Terjadi kesalahan pada server" },
    { status: 500 }
  )
}