-- =========================================================
-- MST_TokenUjian
-- Token masuk ujian. Satu ujian punya satu token aktif.
-- Rotasi nanti: nonaktifkan baris lama (is_active, is_open = FALSE), tambah baris baru.
-- Prasyarat: MST_SoalUjian (011) dan CORE_User
-- =========================================================
CREATE TABLE IF NOT EXISTS "MST_TokenUjian" (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soal_ujian_id  UUID NOT NULL REFERENCES "MST_SoalUjian" (id) ON DELETE CASCADE,
    token          VARCHAR(12) NOT NULL,

    -- Token ini yang berlaku untuk ujian (dipakai saat rotasi)
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,

    -- Ujian sedang dibuka untuk siswa (dinyalakan guru saat ujian mulai)
    is_open        BOOLEAN NOT NULL DEFAULT FALSE,
    opened_at      TIMESTAMPTZ,
    closed_at      TIMESTAMPTZ,

    -- NULL = tidak kedaluwarsa (dipakai kalau nanti token berganti otomatis)
    expires_at     TIMESTAMPTZ,

    created_by     UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Token selalu huruf besar dan angka, jadi pencocokan tidak perlu mempedulikan huruf kecil
    CONSTRAINT ck_mst_tokenujian_format
        CHECK (token ~ '^[A-Z0-9]{4,12}$'),

    -- Token yang sudah tidak berlaku tidak boleh berstatus terbuka
    CONSTRAINT ck_mst_tokenujian_open_active
        CHECK (NOT is_open OR is_active)
);

-- Kalau tabel sudah ada dari versi lama (013 tanpa kolom buka/tutup), tambahkan kolomnya
ALTER TABLE "MST_TokenUjian"
    ADD COLUMN IF NOT EXISTS is_open   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE "MST_TokenUjian" DROP CONSTRAINT IF EXISTS ck_mst_tokenujian_open_active;
ALTER TABLE "MST_TokenUjian" ADD CONSTRAINT ck_mst_tokenujian_open_active
    CHECK (NOT is_open OR is_active);

-- Token aktif unik di semua ujian
CREATE UNIQUE INDEX IF NOT EXISTS uq_mst_tokenujian_token
    ON "MST_TokenUjian" (token)
    WHERE is_active;

-- Satu ujian hanya boleh punya satu token aktif
CREATE UNIQUE INDEX IF NOT EXISTS uq_mst_tokenujian_ujian
    ON "MST_TokenUjian" (soal_ujian_id)
    WHERE is_active;

CREATE INDEX IF NOT EXISTS ix_mst_tokenujian_ujian_id
    ON "MST_TokenUjian" (soal_ujian_id);

CREATE INDEX IF NOT EXISTS ix_mst_tokenujian_created_by
    ON "MST_TokenUjian" (created_by);

-- =========================================================
-- Isi token untuk ujian yang sudah ada sebelum tabel ini dibuat.
-- Aman dijalankan ulang: hanya ujian tanpa token aktif yang diisi.
-- Huruf yang mirip (I, L, O) dan angka 0, 1 tidak dipakai.
-- =========================================================
DO $$
DECLARE
    r      RECORD;
    chars  TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    t      TEXT;
    i      INT;
BEGIN
    FOR r IN
        SELECT s.id
        FROM "MST_SoalUjian" s
        WHERE NOT EXISTS (
            SELECT 1 FROM "MST_TokenUjian" k
            WHERE k.soal_ujian_id = s.id AND k.is_active
        )
    LOOP
        LOOP
            t := '';
            FOR i IN 1..6 LOOP
                t := t || substr(chars, 1 + floor(random() * length(chars))::int, 1);
            END LOOP;

            BEGIN
                INSERT INTO "MST_TokenUjian" (soal_ujian_id, token)
                VALUES (r.id, t);
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- token bentrok, coba token lain
            END;
        END LOOP;
    END LOOP;
END $$;