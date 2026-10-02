-- =========================================================
-- MST_SoalUjian
-- Butir soal (pertanyaan + jawaban) disimpan dalam satu JSONB: data_json
-- Prasyarat: 004 (TahunAjaran), 005 (MataPelajaran), 007 (Kelas)
-- =========================================================
CREATE TABLE IF NOT EXISTS "MST_SoalUjian" (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama             VARCHAR(150) NOT NULL,
    mapel_id         UUID NOT NULL REFERENCES "MST_MataPelajaran" (id) ON DELETE RESTRICT,
    jenis            VARCHAR(30)  NOT NULL,
    tahun_ajaran_id  UUID NOT NULL REFERENCES "MST_TahunAjaran" (id) ON DELETE RESTRICT,
    durasi_menit     SMALLINT     NOT NULL,
    nilai_kkm        SMALLINT     NOT NULL,
    acak_soal        BOOLEAN      NOT NULL DEFAULT TRUE,
    tampilkan_hasil  BOOLEAN      NOT NULL DEFAULT FALSE,
    data_json        JSONB        NOT NULL DEFAULT '{"schemaVersion": 1, "soal": []}'::jsonb,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,

    created_by       UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_mst_soalujian_durasi
        CHECK (durasi_menit > 0 AND durasi_menit <= 600),
    CONSTRAINT ck_mst_soalujian_kkm
        CHECK (nilai_kkm >= 0 AND nilai_kkm <= 100),
    -- COALESCE penting: kalau key "soal" tidak ada, hasil tanpa COALESCE adalah NULL
    -- dan CHECK dianggap lolos
    CONSTRAINT ck_mst_soalujian_datajson
        CHECK (
            jsonb_typeof(data_json) = 'object'
            AND COALESCE(jsonb_typeof(data_json -> 'soal'), '') = 'array'
        )
);

-- Nama ujian unik per tahun ajaran, tanpa membedakan huruf besar/kecil
CREATE UNIQUE INDEX IF NOT EXISTS uq_mst_soalujian_nama
    ON "MST_SoalUjian" (tahun_ajaran_id, LOWER(nama));

CREATE INDEX IF NOT EXISTS ix_mst_soalujian_mapel_id
    ON "MST_SoalUjian" (mapel_id);

CREATE INDEX IF NOT EXISTS ix_mst_soalujian_created_by
    ON "MST_SoalUjian" (created_by);

-- =========================================================
-- MST_SoalUjianKelas (distribusi kelas: ujian <-> kelas)
-- =========================================================
CREATE TABLE IF NOT EXISTS "MST_SoalUjianKelas" (
    soal_ujian_id  UUID NOT NULL REFERENCES "MST_SoalUjian" (id) ON DELETE CASCADE,
    kelas_id       UUID NOT NULL REFERENCES "MST_Kelas" (id) ON DELETE RESTRICT,

    created_by     UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (soal_ujian_id, kelas_id)
);

CREATE INDEX IF NOT EXISTS ix_mst_soalujiankelas_kelas_id
    ON "MST_SoalUjianKelas" (kelas_id);