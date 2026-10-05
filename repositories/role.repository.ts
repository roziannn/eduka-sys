import { query, queryOne } from "@/lib/db"

export type RoleRecord = {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  total_user: number
}

type RoleInput = {
  name: string
  description: string
  isActive: boolean
}

export const roleRepository = {
  findAll() {
    return query<RoleRecord>(
      `SELECT r.id, r.normalized_name AS code, r.name, r.description, r.is_active,
              COUNT(u.id)::int AS total_user
       FROM "CORE_Role" r
       LEFT JOIN "CORE_User" u ON u.role_id = r.id
       GROUP BY r.id
       ORDER BY r.created_at`
    )
  },

  findById(id: string) {
    return queryOne<{ id: string; code: string; name: string }>(
      `SELECT id, normalized_name AS code, name FROM "CORE_Role" WHERE id = $1`,
      [id]
    )
  },

  async findIdByNormalizedName(normalizedName: string) {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM "CORE_Role" WHERE normalized_name = $1`,
      [normalizedName]
    )
    return row?.id ?? null
  },

  async create(code: string, input: RoleInput) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO "CORE_Role" (name, normalized_name, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.name, code, input.description, input.isActive]
    )
    return row!.id
  },

  async update(id: string, input: RoleInput) {
    const row = await queryOne<{ id: string }>(
      `UPDATE "CORE_Role"
       SET name = $2, description = $3, is_active = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, input.name, input.description, input.isActive]
    )
    return row !== null
  },
}