import type { PoolClient } from "pg"
import { query, queryOne, withTransaction } from "@/lib/db"

export type MenuRow = {
  id: string
  parent_id: string | null
  name: string
  url: string | null
  icon: string | null
  seq: number
  is_active: boolean
}

export type FunctionRow = {
  id: string
  menu_id: string
  code: string
  seq: number
}

// id null = button baru. id terisi = button yang sudah ada (kodenya boleh berubah, id tetap).
export type ButtonInput = { id: string | null; code: string }

export type CreateMenuInput = {
  parentId: string | null
  name: string
  url: string
  icon: string | null
  seq?: number // undefined = otomatis ditaruh paling akhir di antara menu yang satu induk
  buttons?: ButtonInput[] // undefined = tidak ada button
}

export type UpdateMenuInput = {
  name: string
  url: string
  icon?: string | null // undefined = ikon tidak diubah, null = hapus ikon
  seq?: number // undefined = urutan tidak diubah
  buttons?: ButtonInput[] // undefined = button tidak disentuh
}

// Samakan button sebuah menu dengan daftar baru, berdasarkan id:
// - id tidak ada di daftar baru  -> dihapus
// - id ada, kode atau urutan beda -> diperbarui (id tetap, jadi relasi lain tidak putus)
// - tanpa id                      -> ditambahkan
async function syncFunctions(
  client: PoolClient,
  menuId: string,
  items: ButtonInput[],
  actorId: string
) {
  const existing = await client.query<{ id: string; code: string }>(
    `SELECT id, code FROM "CORE_MenuFunction" WHERE menu_id = $1 FOR UPDATE`,
    [menuId]
  )
  const codeById = new Map(existing.rows.map((r) => [r.id, r.code]))

  const ordered = items.map((item, i) => ({ ...item, seq: i + 1 }))
  const kept = ordered.filter((x) => x.id !== null) as {
    id: string
    code: string
    seq: number
  }[]
  const fresh = ordered.filter((x) => x.id === null)

  // 1) Hapus yang dibuang. Dijalankan lebih dulu supaya kodenya bisa dipakai ulang.
  await client.query(
    `DELETE FROM "CORE_MenuFunction"
     WHERE menu_id = $1 AND id <> ALL($2::uuid[])`,
    [menuId, kept.map((x) => x.id)]
  )

  // 2) Yang kodenya berubah dipindah dulu ke kode sementara, supaya tukar kode antar
  //    dua button tidak menabrak aturan unik (menu_id, code)
  const renamed = kept.filter((x) => codeById.get(x.id) !== x.code)
  if (renamed.length > 0) {
    await client.query(
      `UPDATE "CORE_MenuFunction"
       SET code = 'tmp-' || id::text
       WHERE menu_id = $2 AND id = ANY($1::uuid[])`,
      [renamed.map((x) => x.id), menuId]
    )
  }

  // 3) Terapkan kode dan urutan final. Baris yang tidak berubah dilewati,
  //    jadi updated_at-nya tidak ikut berubah.
  if (kept.length > 0) {
    await client.query(
      `UPDATE "CORE_MenuFunction" f
       SET code = x.code, seq = x.seq, updated_by = $4, updated_at = NOW()
       FROM unnest($1::uuid[], $2::text[], $3::int[]) AS x(id, code, seq)
       WHERE f.id = x.id AND f.menu_id = $5
         AND (f.code <> x.code OR f.seq <> x.seq)`,
      [
        kept.map((x) => x.id),
        kept.map((x) => x.code),
        kept.map((x) => x.seq),
        actorId,
        menuId,
      ]
    )
  }

  // 4) Tambahkan yang baru
  if (fresh.length > 0) {
    await client.query(
      `INSERT INTO "CORE_MenuFunction" (menu_id, code, seq, created_by, updated_by)
       SELECT $1::uuid, x.code, x.seq, $4::uuid, $4::uuid
       FROM unnest($2::text[], $3::int[]) AS x(code, seq)`,
      [menuId, fresh.map((x) => x.code), fresh.map((x) => x.seq), actorId]
    )
  }
}

export const menuRepository = {
  findAllMenus() {
    return query<MenuRow>(
      `SELECT id, parent_id, name, url, icon, seq, is_active
       FROM "CORE_Menu"
       ORDER BY seq, name`
    )
  },

  findAllFunctions() {
    return query<FunctionRow>(
      `SELECT id, menu_id, code, seq
       FROM "CORE_MenuFunction"
       ORDER BY seq, code`
    )
  },

  findById(id: string) {
    return queryOne<MenuRow>(
      `SELECT id, parent_id, name, url, icon, seq, is_active
       FROM "CORE_Menu" WHERE id = $1`,
      [id]
    )
  },

  async findFunctionIds(menuId: string) {
    const rows = await query<{ id: string }>(
      `SELECT id FROM "CORE_MenuFunction" WHERE menu_id = $1`,
      [menuId]
    )
    return rows.map((r) => r.id)
  },

  // Menu dan button-nya disimpan dalam satu transaksi.
  // Urutan tidak diisi = urutan terakhir di antara menu yang satu induk.
  create(input: CreateMenuInput, actorId: string) {
    return withTransaction(async (client) => {
      let seq = input.seq
      if (seq === undefined) {
        const next = await client.query<{ next: number }>(
          `SELECT COALESCE(MAX(seq), 0) + 1 AS next
           FROM "CORE_Menu"
           WHERE parent_id IS NOT DISTINCT FROM $1::uuid`,
          [input.parentId]
        )
        seq = next.rows[0].next
      }

      const res = await client.query<{ id: string }>(
        `INSERT INTO "CORE_Menu"
           (parent_id, name, url, icon, seq, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $6)
         RETURNING id`,
        [
          input.parentId,
          input.name,
          input.url,
          input.icon,
          seq,
          actorId,
        ]
      )
      const id = res.rows[0].id

      if (input.buttons) {
        await syncFunctions(client, id, input.buttons, actorId)
      }
      return id
    })
  },

  // false kalau menu tidak ditemukan. Menu induk tidak diubah di sini.
  // $5 menandai apakah ikon ikut diubah, $6 nilai ikon barunya (boleh null = hapus ikon).
  // $7 urutan baru, null = urutan tidak diubah.
  update(id: string, input: UpdateMenuInput, actorId: string) {
    return withTransaction(async (client) => {
      const res = await client.query(
        `UPDATE "CORE_Menu"
         SET name = $2,
             url = $3,
             icon = CASE WHEN $5::boolean THEN $6::varchar ELSE icon END,
             seq = COALESCE($7::int, seq),
             updated_by = $4,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [
          id,
          input.name,
          input.url,
          actorId,
          input.icon !== undefined,
          input.icon ?? null,
          input.seq ?? null,
        ]
      )
      if (res.rowCount === 0) return false

      if (input.buttons) {
        await syncFunctions(client, id, input.buttons, actorId)
      }
      return true
    })
  },
}