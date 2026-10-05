import { query, withTransaction } from "@/lib/db"

export type RoleMenuRow = {
  menu_id: string
  function_id: string | null
  is_active: boolean
  is_active_btn: boolean
}

export type MenuAccessInput = { menuId: string; active: boolean }
export type FunctionAccessInput = {
  menuId: string
  functionId: string
  active: boolean
}

export const roleMenuRepository = {
  findByRole(roleId: string) {
    return query<RoleMenuRow>(
      `SELECT menu_id, function_id, is_active, is_active_btn
       FROM "CORE_RoleMenu"
       WHERE role_id = $1`,
      [roleId]
    )
  },

  // Simpan seluruh izin sebuah role dalam satu transaksi.
  // Baris yang sudah ada diperbarui (audit created_* tetap), yang belum ada ditambahkan.
  // Baris yang nilainya tidak berubah dilewati, jadi updated_at-nya tidak ikut berubah.
  save(
    roleId: string,
    menus: MenuAccessInput[],
    functions: FunctionAccessInput[],
    actorId: string
  ) {
    return withTransaction(async (client) => {
      if (menus.length > 0) {
        await client.query(
          `INSERT INTO "CORE_RoleMenu"
             (role_id, menu_id, function_id, is_active, is_active_btn, created_by, updated_by)
           SELECT $1::uuid, x.menu_id, NULL, x.active, FALSE, $4::uuid, $4::uuid
           FROM unnest($2::uuid[], $3::boolean[]) AS x(menu_id, active)
           ON CONFLICT (role_id, menu_id) WHERE function_id IS NULL
           DO UPDATE SET is_active = EXCLUDED.is_active,
                         updated_by = EXCLUDED.updated_by,
                         updated_at = NOW()
           WHERE "CORE_RoleMenu".is_active IS DISTINCT FROM EXCLUDED.is_active`,
          [roleId, menus.map((m) => m.menuId), menus.map((m) => m.active), actorId]
        )
      }

      if (functions.length > 0) {
        await client.query(
          `INSERT INTO "CORE_RoleMenu"
             (role_id, menu_id, function_id, is_active, is_active_btn, created_by, updated_by)
           SELECT $1::uuid, x.menu_id, x.function_id, FALSE, x.active, $5::uuid, $5::uuid
           FROM unnest($2::uuid[], $3::uuid[], $4::boolean[]) AS x(menu_id, function_id, active)
           ON CONFLICT (role_id, function_id) WHERE function_id IS NOT NULL
           DO UPDATE SET is_active_btn = EXCLUDED.is_active_btn,
                         updated_by = EXCLUDED.updated_by,
                         updated_at = NOW()
           WHERE "CORE_RoleMenu".is_active_btn IS DISTINCT FROM EXCLUDED.is_active_btn`,
          [
            roleId,
            functions.map((f) => f.menuId),
            functions.map((f) => f.functionId),
            functions.map((f) => f.active),
            actorId,
          ]
        )
      }
    })
  },
}
