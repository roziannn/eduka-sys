-- =========================================================
-- CORE_Menu
-- Menu utama (parent_id kosong) dan sub menu (parent_id terisi).
-- Maksimal dua tingkat. Prasyarat: CORE_User
-- =========================================================
CREATE TABLE IF NOT EXISTS "CORE_Menu" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID REFERENCES "CORE_Menu" (id) ON DELETE RESTRICT,
    name        VARCHAR(100) NOT NULL,
    url         VARCHAR(255),          -- '#' kalau menu utama punya sub menu
    icon        VARCHAR(50),           -- nama ikon sidebar, contoh: LayoutDashboard
    seq         SMALLINT     NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,

    created_by  UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by  UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_core_menu_name
        CHECK (length(btrim(name)) > 0),
    -- Kosong, '#', atau rute yang diawali '/'
    CONSTRAINT ck_core_menu_url
        CHECK (url IS NULL OR url = '#' OR url ~ '^/[A-Za-z0-9/_-]*$'),
    -- URL opsional untuk menu utama, tapi sub menu wajib punya rute asli
    CONSTRAINT ck_core_menu_sub_url
        CHECK (parent_id IS NULL OR (url IS NOT NULL AND url <> '#')),
    CONSTRAINT ck_core_menu_seq
        CHECK (seq >= 0)
);

-- Nama menu utama unik, nama sub menu unik di dalam induknya (tanpa membedakan huruf besar/kecil)
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_menu_name_main
    ON "CORE_Menu" (LOWER(name))
    WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_menu_name_sub
    ON "CORE_Menu" (parent_id, LOWER(name))
    WHERE parent_id IS NOT NULL;

-- Satu rute hanya boleh dipakai satu menu ('#' dan kosong dikecualikan)
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_menu_url
    ON "CORE_Menu" (LOWER(url))
    WHERE url IS NOT NULL AND url <> '#';

CREATE INDEX IF NOT EXISTS ix_core_menu_parent
    ON "CORE_Menu" (parent_id, seq);

CREATE INDEX IF NOT EXISTS ix_core_menu_created_by
    ON "CORE_Menu" (created_by);

-- =========================================================
-- Batas dua tingkat. CHECK tidak bisa membaca baris lain, jadi memakai trigger.
-- Sekaligus mencegah siklus (A induk B, B induk A).
-- =========================================================
CREATE OR REPLACE FUNCTION fn_core_menu_check_parent()
RETURNS trigger AS $$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF NEW.parent_id = NEW.id THEN
            RAISE EXCEPTION 'Menu tidak boleh menjadi induk dirinya sendiri'
                USING ERRCODE = 'check_violation';
        END IF;

        -- Induk harus menu utama
        IF EXISTS (
            SELECT 1 FROM "CORE_Menu" WHERE id = NEW.parent_id AND parent_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Menu hanya boleh dua tingkat: menu utama dan sub menu'
                USING ERRCODE = 'check_violation';
        END IF;

        -- Menu yang masih punya sub menu tidak boleh dijadikan sub menu
        IF EXISTS (SELECT 1 FROM "CORE_Menu" WHERE parent_id = NEW.id) THEN
            RAISE EXCEPTION 'Menu yang masih punya sub menu tidak boleh dijadikan sub menu'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_core_menu_parent ON "CORE_Menu";
CREATE TRIGGER trg_core_menu_parent
    BEFORE INSERT OR UPDATE OF parent_id ON "CORE_Menu"
    FOR EACH ROW EXECUTE FUNCTION fn_core_menu_check_parent();

-- =========================================================
-- CORE_MenuFunction
-- Button action (permission) milik sebuah menu. Contoh: btn-add, btn-edit, btn-delete.
-- Edit button = UPDATE baris ini, hapus button = DELETE baris ini.
-- =========================================================
CREATE TABLE IF NOT EXISTS "CORE_MenuFunction" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id     UUID NOT NULL REFERENCES "CORE_Menu" (id) ON DELETE CASCADE,
    code        VARCHAR(50) NOT NULL,
    seq         SMALLINT    NOT NULL DEFAULT 0,

    created_by  UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Huruf kecil, angka, dan tanda minus: btn-save, btn-add-sub
    CONSTRAINT ck_core_menufunction_code
        CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT ck_core_menufunction_seq
        CHECK (seq >= 0),
    -- Satu button tidak boleh muncul dua kali di menu yang sama
    CONSTRAINT uq_core_menufunction_menu_code
        UNIQUE (menu_id, code)
);

CREATE INDEX IF NOT EXISTS ix_core_menufunction_menu
    ON "CORE_MenuFunction" (menu_id, seq);

CREATE INDEX IF NOT EXISTS ix_core_menufunction_created_by
    ON "CORE_MenuFunction" (created_by);