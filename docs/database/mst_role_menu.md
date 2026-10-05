-- =========================================================
-- CORE_RoleMenu
-- Izin akses sebuah role ke menu dan button.
-- Satu baris = satu izin:
--   function_id kosong -> akses ke menu/sub menu, dibaca dari is_active
--   function_id terisi -> akses ke button (CORE_MenuFunction), dibaca dari is_active_btn.
--                         is_active di baris ini = akses sub menu pemilik button.
-- is_active_btn di baris menu selalu FALSE.
-- Prasyarat: CORE_Role, CORE_Menu, CORE_MenuFunction, CORE_User
-- =========================================================
CREATE TABLE IF NOT EXISTS "CORE_RoleMenu" (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id        UUID NOT NULL REFERENCES "CORE_Role" (id) ON DELETE CASCADE,
    menu_id        UUID NOT NULL REFERENCES "CORE_Menu" (id) ON DELETE CASCADE,
    function_id    UUID REFERENCES "CORE_MenuFunction" (id) ON DELETE CASCADE,
    is_active      BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active_btn  BOOLEAN     NOT NULL DEFAULT FALSE,

    created_by     UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Button hanya boleh aktif kalau menunya aktif
    CONSTRAINT ck_core_rm_btn_needs_menu
        CHECK (NOT is_active_btn OR is_active)
);

-- Satu role hanya punya satu baris per menu, dan satu baris per button
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_rolemenu_menu
    ON "CORE_RoleMenu" (role_id, menu_id)
    WHERE function_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_rolemenu_function
    ON "CORE_RoleMenu" (role_id, function_id)
    WHERE function_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_core_rolemenu_menu
    ON "CORE_RoleMenu" (menu_id);

CREATE INDEX IF NOT EXISTS ix_core_rolemenu_function
    ON "CORE_RoleMenu" (function_id);
