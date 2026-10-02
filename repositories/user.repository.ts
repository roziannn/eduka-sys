import { query, queryOne } from "@/lib/db"

export type UserRecord = {
  id: string
  username: string
  email: string
  full_name: string | null
  nip_nisn: string | null
  is_active: boolean
  last_login_at: Date | null
  role_normalized: string
}

const SELECT_USER = `
  SELECT u.id, u.username, u.email, u.full_name, u.nip_nisn,
         u.is_active, u.last_login_at,
         r.normalized_name AS role_normalized
  FROM "CORE_User" u
  JOIN "CORE_Role" r ON r.id = u.role_id
`

export type CreateUserInput = {
  roleId: string
  username: string
  email: string
  fullName: string
  nipNisn: string | null
  passwordHash: string
  isActive: boolean
}

export type UpdateUserInput = {
  roleId: string
  email: string
  fullName: string
  nipNisn: string | null
  isActive: boolean
}

export const userRepository = {
  async findAll(): Promise<UserRecord[]> {
    return query<UserRecord>(`${SELECT_USER} ORDER BY u.created_at DESC`)
  },

  async findById(id: string): Promise<UserRecord | null> {
    return queryOne<UserRecord>(`${SELECT_USER} WHERE u.id = $1`, [id])
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    return queryOne<UserRecord>(
      `${SELECT_USER} WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    )
  },

  async create(input: CreateUserInput): Promise<string> {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO "CORE_User"
         (role_id, username, email, full_name, nip_nisn, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.roleId,
        input.username,
        input.email,
        input.fullName,
        input.nipNisn,
        input.passwordHash,
        input.isActive,
      ]
    )
    return row!.id
  },

  async update(id: string, input: UpdateUserInput): Promise<boolean> {
    const row = await queryOne<{ id: string }>(
      `UPDATE "CORE_User"
       SET role_id = $2, email = $3, full_name = $4, nip_nisn = $5,
           is_active = $6, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        input.roleId,
        input.email,
        input.fullName,
        input.nipNisn,
        input.isActive,
      ]
    )
    return row !== null
  },

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const row = await queryOne<{ id: string }>(
      `UPDATE "CORE_User"
       SET password_hash = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, passwordHash]
    )
    return row !== null
  },

  async updateLastLogin(id: string): Promise<void> {
    await query(`UPDATE "CORE_User" SET last_login_at = NOW() WHERE id = $1`, [id])
  },
}