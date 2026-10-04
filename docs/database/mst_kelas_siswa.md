-- =========================================================
-- MST_KelasSiswa: siswa berada di kelas mana, per tahun ajaran.
-- Naik kelas = tambah baris untuk tahun ajaran baru (riwayat tetap ada).
-- Prasyarat: CORE_User, MST_Kelas (007)
-- =========================================================
CREATE TABLE IF NOT EXISTS "MST_KelasSiswa" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES "CORE_User" (id) ON DELETE CASCADE,
    kelas_id      UUID NOT NULL REFERENCES "MST_Kelas" (id) ON DELETE RESTRICT,
    tahun_ajaran  VARCHAR(9) NOT NULL,   -- contoh: 2025/2026

    created_by    UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by    UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_mst_kelassiswa_tahun
        CHECK (tahun_ajaran ~ '^[0-9]{4}/[0-9]{4}$'),

    -- Satu siswa hanya di satu kelas pada satu tahun ajaran
    CONSTRAINT uq_mst_kelassiswa_user_tahun
        UNIQUE (user_id, tahun_ajaran)
);

CREATE INDEX IF NOT EXISTS ix_mst_kelassiswa_kelas
    ON "MST_KelasSiswa" (kelas_id, tahun_ajaran);

-- =========================================================
-- MST_PengajarKelas: guru mengajar di kelas mana (dan mapel apa),
-- atau menjadi wali kelas, per tahun ajaran.
-- Prasyarat: CORE_User, MST_Kelas (007), MST_MataPelajaran (005)
-- =========================================================
CREATE TABLE IF NOT EXISTS "MST_PengajarKelas" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES "CORE_User" (id) ON DELETE CASCADE,
    kelas_id      UUID NOT NULL REFERENCES "MST_Kelas" (id) ON DELETE RESTRICT,
    mapel_id      UUID REFERENCES "MST_MataPelajaran" (id) ON DELETE RESTRICT,
    peran         VARCHAR(10) NOT NULL,  -- WALI | PENGAJAR
    tahun_ajaran  VARCHAR(9) NOT NULL,

    created_by    UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by    UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_mst_pengajarkelas_tahun
        CHECK (tahun_ajaran ~ '^[0-9]{4}/[0-9]{4}$'),
    CONSTRAINT ck_mst_pengajarkelas_peran
        CHECK (peran IN ('WALI', 'PENGAJAR')),
    -- Wali kelas tidak terikat mapel. Pengajar wajib punya mapel.
    CONSTRAINT ck_mst_pengajarkelas_mapel
        CHECK (
            (peran = 'WALI' AND mapel_id IS NULL)
            OR (peran = 'PENGAJAR' AND mapel_id IS NOT NULL)
        )
);

-- Satu kelas hanya punya satu wali per tahun ajaran
CREATE UNIQUE INDEX IF NOT EXISTS uq_mst_pengajarkelas_wali
    ON "MST_PengajarKelas" (kelas_id, tahun_ajaran)
    WHERE peran = 'WALI';

-- Guru yang sama tidak dicatat dua kali untuk kelas, mapel, dan tahun yang sama
CREATE UNIQUE INDEX IF NOT EXISTS uq_mst_pengajarkelas_pengajar
    ON "MST_PengajarKelas" (user_id, kelas_id, mapel_id, tahun_ajaran)
    WHERE peran = 'PENGAJAR';

CREATE INDEX IF NOT EXISTS ix_mst_pengajarkelas_user
    ON "MST_PengajarKelas" (user_id, tahun_ajaran);