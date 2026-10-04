import type { PoolClient } from "pg"
import { query, queryOne, withTransaction } from "@/lib/db"

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

// Untuk daftar pengguna: ikut membawa kelas siswa pada tahun ajaran yang diminta
export type UserListRecord = UserRecord & {
  kelas_id: string | null
  kelas_nama: string | null
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

// Penempatan kelas pada satu tahun ajaran.
// kelasId berisi id kelas = pasang atau pindahkan, null = cabut kelas di tahun itu.
export type KelasPlacement = { tahunAjaran: string; kelasId: string | null }

// Satu siswa hanya di satu kelas per tahun ajaran, jadi pemasangan memakai upsert
async function applyPlacement(
  client: PoolClient,
  userId: string,
  placement: KelasPlacement | null,
  actorId: string
) {
  if (!placement) return

  if (placement.kelasId === null) {
    await client.query(
      `DELETE FROM "MST_KelasSiswa" WHERE user_id = $1 AND tahun_ajaran = $2`,
      [userId, placement.tahunAjaran]
    )
    return
  }

  await client.query(
    `INSERT INTO "MST_KelasSiswa" (user_id, kelas_id, tahun_ajaran, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (user_id, tahun_ajaran)
     DO UPDATE SET kelas_id = EXCLUDED.kelas_id,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = NOW()`,
    [userId, placement.kelasId, placement.tahunAjaran, actorId]
  )
}

export const userRepository = {
  // tahunAjaran null = tahun ajaran yang sedang aktif.
  // LEFT JOIN: unique (user_id, tahun_ajaran) menjamin satu baris per pengguna.
  findAll(tahunAjaran: string | null = null): Promise<UserListRecord[]> {
    return query<UserListRecord>(
      `SELECT u.id, u.username, u.email, u.full_name, u.nip_nisn,
              u.is_active, u.last_login_at,
              r.normalized_name AS role_normalized,
              k.id AS kelas_id, k.nama_kelas AS kelas_nama
       FROM "CORE_User" u
       JOIN "CORE_Role" r ON r.id = u.role_id
       LEFT JOIN "MST_KelasSiswa" ks
              ON ks.user_id = u.id
             AND ks.tahun_ajaran = COALESCE(
                   $1::text,
                   (SELECT tahun_ajaran FROM "MST_TahunAjaran" WHERE is_active LIMIT 1)
                 )
       LEFT JOIN "MST_Kelas" k ON k.id = ks.kelas_id
       ORDER BY u.created_at DESC`,
      [tahunAjaran]
    )
  },

  async findActiveTahunAjaran(): Promise<string | null> {
    const row = await queryOne<{ tahun_ajaran: string }>(
      `SELECT tahun_ajaran FROM "MST_TahunAjaran" WHERE is_active LIMIT 1`
    )
    return row?.tahun_ajaran ?? null
  },

  async kelasExists(kelasId: string): Promise<boolean> {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM "MST_Kelas" WHERE id = $1`,
      [kelasId]
    )
    return row !== null
  },

  // Berapa dari id yang diberikan adalah akun berperan siswa
  async countStudents(ids: string[]): Promise<number> {
    const row = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n
       FROM "CORE_User" u
       JOIN "CORE_Role" r ON r.id = u.role_id
       WHERE u.id = ANY($1::uuid[]) AND r.normalized_name = 'STUDENT'`,
      [ids]
    )
    return row?.n ?? 0
  },

  // Berapa dari id yang diberikan adalah kelas yang ada
  async countKelas(ids: string[]): Promise<number> {
    const row = await queryOne<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM "MST_Kelas" WHERE id = ANY($1::uuid[])`,
      [ids]
    )
    return row?.n ?? 0
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

  // Akun dan penempatan kelas disimpan dalam satu transaksi
  create(
    input: CreateUserInput,
    placement: KelasPlacement | null,
    actorId: string
  ): Promise<string> {
    return withTransaction(async (client) => {
      const res = await client.query<{ id: string }>(
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
      const id = res.rows[0].id
      await applyPlacement(client, id, placement, actorId)
      return id
    })
  },

  // false kalau pengguna tidak ditemukan
  update(
    id: string,
    input: UpdateUserInput,
    placement: KelasPlacement | null,
    actorId: string
  ): Promise<boolean> {
    return withTransaction(async (client) => {
      const res = await client.query(
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
      if (res.rowCount === 0) return false

      await applyPlacement(client, id, placement, actorId)
      return true
    })
  },

  // Pindah / naik kelas massal dalam satu transaksi.
  // moves: pasang atau pindahkan (upsert). removeUserIds: cabut kelas pada tahun ajaran itu.
  bulkAssignKelas(
    tahunAjaran: string,
    moves: { userId: string; kelasId: string }[],
    removeUserIds: string[],
    actorId: string
  ): Promise<{ moved: number; removed: number }> {
    return withTransaction(async (client) => {
      let moved = 0
      let removed = 0

      if (moves.length > 0) {
        const res = await client.query(
          `INSERT INTO "MST_KelasSiswa" (user_id, kelas_id, tahun_ajaran, created_by, updated_by)
           SELECT x.user_id, x.kelas_id, $3::varchar, $4::uuid, $4::uuid
           FROM unnest($1::uuid[], $2::uuid[]) AS x(user_id, kelas_id)
           ON CONFLICT (user_id, tahun_ajaran)
           DO UPDATE SET kelas_id = EXCLUDED.kelas_id,
                         updated_by = EXCLUDED.updated_by,
                         updated_at = NOW()`,
          [moves.map((m) => m.userId), moves.map((m) => m.kelasId), tahunAjaran, actorId]
        )
        moved = res.rowCount ?? 0
      }

      if (removeUserIds.length > 0) {
        const res = await client.query(
          `DELETE FROM "MST_KelasSiswa"
           WHERE user_id = ANY($1::uuid[]) AND tahun_ajaran = $2`,
          [removeUserIds, tahunAjaran]
        )
        removed = res.rowCount ?? 0
      }

      return { moved, removed }
    })
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