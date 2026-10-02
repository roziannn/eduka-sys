-- MST_MataPelajaran
CREATE TABLE IF NOT EXISTS "MST_MataPelajaran" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode        VARCHAR(20)  NOT NULL,
    nama        VARCHAR(150) NOT NULL,
    kategori    VARCHAR(50)  NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,

    created_by  UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by  UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mst_matapelajaran_kode_lower
    ON "MST_MataPelajaran" (LOWER(kode));

CREATE INDEX IF NOT EXISTS ix_mst_matapelajaran_kategori
    ON "MST_MataPelajaran" (kategori);

CREATE INDEX IF NOT EXISTS ix_mst_matapelajaran_created_by
    ON "MST_MataPelajaran" (created_by);

    --psql -h 127.0.0.1 -p 5433 -U postgres -d EDUKA_APP -f db/005_mst_mata_pelajaran.sql