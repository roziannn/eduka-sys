-- =========================================================
-- TRN_PercobaanUjian
-- Satu baris = satu siswa mengerjakan satu ujian (satu kali percobaan).
-- Waktu mulai dan batas waktu ditentukan server, jadi siswa tidak bisa
-- mengulang timer dengan menghapus data browser.
-- Prasyarat: MST_SoalUjian, CORE_User
-- =========================================================
CREATE TABLE IF NOT EXISTS "TRN_PercobaanUjian" (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soal_ujian_id  UUID NOT NULL REFERENCES "MST_SoalUjian" (id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES "CORE_User" (id) ON DELETE CASCADE,

    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at    TIMESTAMPTZ NOT NULL,         -- started_at + durasi ujian
    submitted_at   TIMESTAMPTZ,                  -- terisi saat dikumpulkan atau waktu habis
    status         VARCHAR(10) NOT NULL DEFAULT 'Berjalan',

    -- Urutan id soal untuk siswa ini (diacak kalau ujian mengacak soal)
    urutan_soal    JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Skor otomatis dari soal pilihan ganda. skor_maks = total bobot semua soal.
    -- Soal essai dinilai guru nanti.
    skor_pg        NUMERIC(8,2),
    skor_maks      NUMERIC(8,2),

    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_trn_percobaanujian_status
        CHECK (status IN ('Berjalan', 'Selesai')),
    CONSTRAINT ck_trn_percobaanujian_deadline
        CHECK (deadline_at > started_at),
    CONSTRAINT ck_trn_percobaanujian_submitted
        CHECK ((status = 'Selesai') = (submitted_at IS NOT NULL)),
    CONSTRAINT ck_trn_percobaanujian_urutan
        CHECK (jsonb_typeof(urutan_soal) = 'array'),

    -- Satu siswa hanya satu kali percobaan per ujian
    CONSTRAINT uq_trn_percobaanujian_user
        UNIQUE (soal_ujian_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_trn_percobaanujian_user
    ON "TRN_PercobaanUjian" (user_id);

-- =========================================================
-- TRN_JawabanUjian
-- Jawaban siswa per soal. jawaban:
--   pilihan ganda -> array id opsi yang dipilih, contoh ["opsi-id-1"]
--   essai         -> teks jawaban
-- Prasyarat: TRN_PercobaanUjian
-- =========================================================
CREATE TABLE IF NOT EXISTS "TRN_JawabanUjian" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    percobaan_id  UUID NOT NULL REFERENCES "TRN_PercobaanUjian" (id) ON DELETE CASCADE,
    soal_id       VARCHAR(64) NOT NULL,          -- id soal di data_json ujian
    jawaban       JSONB NOT NULL,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_trn_jawabanujian_jawaban
        CHECK (jsonb_typeof(jawaban) IN ('array', 'string')),

    -- Satu jawaban per soal per percobaan
    CONSTRAINT uq_trn_jawabanujian_soal
        UNIQUE (percobaan_id, soal_id)
);
