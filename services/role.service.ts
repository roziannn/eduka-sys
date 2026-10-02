import { ApiError } from "@/lib/api"
import { roleRepository, type RoleRecord } from "@/repositories/role.repository"

export type RolePayload = {
  namaRole: string
  deskripsi: string
  status?: string
}

const toCode = (name: string) =>
  name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")

const formatRole = (r: RoleRecord) => ({
  id: r.id,
  code: r.code,
  name: r.name,
  description: r.description ?? "",
  total_user: r.total_user,
  status: r.is_active ? "Aktif" : "Nonaktif",
})

function parse(payload: RolePayload) {
  const name = (payload.namaRole ?? "").trim()
  if (!name) throw new ApiError(400, "Nama role wajib diisi")

  return {
    name,
    description: (payload.deskripsi ?? "").trim(),
    isActive: payload.status !== "Nonaktif",
  }
}

export const roleService = {
  async list() {
    return (await roleRepository.findAll()).map(formatRole)
  },

  async create(payload: RolePayload) {
    const input = parse(payload)
    const code = toCode(input.name)
    if (!code) throw new ApiError(400, "Nama role tidak valid")

    return { id: await roleRepository.create(code, input) }
  },

  async update(id: string, payload: RolePayload) {
    const updated = await roleRepository.update(id, parse(payload))
    if (!updated) throw new ApiError(404, "Role tidak ditemukan")
  },
}