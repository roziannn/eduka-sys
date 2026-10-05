-- =========================================================
-- TRN_PercobaanUjian
-- Satu baris = satu siswa mengerjakan satu ujian (satu kali percobaan).
-- Waktu mulai dan batas waktu ditentukan server, jadi siswa tidak bisa
-- mengulang timer dengan menghapus data browser.
--
-- Ujian ulang (karena kendala teknis dsb): percobaan lama tidak dihapus, hanya ditandai
-- is_active = FALSE (riwayat tetap ada). Siswa lalu bisa memulai percobaan baru.
--
-- Remedial: percobaan awal (jenis Utama, remedial_ke 0) TETAP aktif dan nilainya tetap ada.
-- Remedial adalah percobaan tambahan (jenis Remedial, remedial_ke 1, 2, ...) yang diizinkan guru
-- lewat TRN_RemedialUjian. Aturan:
--   * hanya untuk siswa yang nilai terbaiknya masih di bawah KKM
--   * maksimal 2 kali remedial per ujian (diatur di aplikasi)
--   * nilai remedial dibatasi paling tinggi sama dengan KKM (nilai_tercatat)
--   * nilai siswa untuk ujian itu = nilai_tercatat TERBAIK dari semua percobaan aktif
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

    -- Dihitung ulang dari TRN_JawabanUjian setiap ada perubahan nilai.
    -- skor_maks = total bobot semua soal, nilai_akhir = skala 0-100.
    skor_pg        NUMERIC(8,2),
    skor_essai     NUMERIC(8,2),
    skor_maks      NUMERIC(8,2),
    -- Menunggu = masih ada essai yang belum dinilai guru. nilai_akhir baru terisi saat Final.
    status_nilai   VARCHAR(10),
    nilai_akhir    NUMERIC(5,2),
    -- Nilai yang dihitung sebagai nilai siswa. Utama = nilai_akhir.
    -- Remedial = nilai_akhir yang dibatasi paling tinggi KKM ujian.
    nilai_tercatat NUMERIC(5,2),

    -- Remedial
    jenis          VARCHAR(10) NOT NULL DEFAULT 'Utama',
    remedial_ke    SMALLINT NOT NULL DEFAULT 0,        -- 0 = percobaan awal

    -- Ujian ulang
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    direset_oleh   UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    direset_at     TIMESTAMPTZ,
    alasan_reset   VARCHAR(30),

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
    CONSTRAINT ck_trn_percobaanujian_statusnilai
        CHECK (status_nilai IS NULL OR status_nilai IN ('Final', 'Menunggu')),
    CONSTRAINT ck_trn_percobaanujian_nilai
        CHECK (nilai_akhir IS NULL OR (nilai_akhir >= 0 AND nilai_akhir <= 100)),
    CONSTRAINT ck_trn_percobaanujian_tercatat
        CHECK (nilai_tercatat IS NULL OR (nilai_tercatat >= 0 AND nilai_tercatat <= 100)),
    CONSTRAINT ck_trn_percobaanujian_jenis
        CHECK (jenis IN ('Utama', 'Remedial') AND remedial_ke >= 0
               AND ((jenis = 'Utama') = (remedial_ke = 0)))
);

CREATE INDEX IF NOT EXISTS ix_trn_percobaanujian_user
    ON "TRN_PercobaanUjian" (user_id);

-- =========================================================
-- TRN_JawabanUjian
-- Jawaban siswa per soal. jawaban:
--   pilihan ganda -> array id opsi yang dipilih, contoh ["opsi-id-1"]
--   essai         -> teks jawaban
-- Saat dikumpulkan, setiap soal dibuatkan barisnya (tipe, bobot, is_benar, nilai).
-- Pilihan ganda dinilai otomatis. Essai: nilai NULL sampai guru menilai
-- (essai yang dikosongkan siswa langsung bernilai 0).
-- Prasyarat: TRN_PercobaanUjian
-- =========================================================
CREATE TABLE IF NOT EXISTS "TRN_JawabanUjian" (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    percobaan_id  UUID NOT NULL REFERENCES "TRN_PercobaanUjian" (id) ON DELETE CASCADE,
    soal_id       VARCHAR(64) NOT NULL,          -- id soal di data_json ujian
    jawaban       JSONB NOT NULL,

    -- Salinan saat dikumpulkan, supaya nilai tidak berubah kalau ujian diedit kemudian
    tipe          VARCHAR(5),                    -- PG | ESSAI
    bobot         NUMERIC(6,2),
    is_benar      BOOLEAN,                       -- hanya pilihan ganda
    nilai         NUMERIC(6,2),                  -- poin yang didapat, 0 sampai bobot
    catatan       TEXT,                          -- komentar guru untuk essai
    dinilai_oleh  UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    dinilai_at    TIMESTAMPTZ,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_trn_jawabanujian_jawaban
        CHECK (jsonb_typeof(jawaban) IN ('array', 'string')),
    CONSTRAINT ck_trn_jawabanujian_tipe
        CHECK (tipe IS NULL OR tipe IN ('PG', 'ESSAI')),
    CONSTRAINT ck_trn_jawabanujian_nilai
        CHECK (nilai IS NULL OR (bobot IS NOT NULL AND nilai >= 0 AND nilai <= bobot)),

    -- Satu jawaban per soal per percobaan
    CONSTRAINT uq_trn_jawabanujian_soal
        UNIQUE (percobaan_id, soal_id)
);

-- =========================================================
-- TRN_TokenGagal
-- Catatan token salah per user, untuk membatasi tebak-tebakan token.
-- Aturan (di aplikasi): 5 kali salah dalam 15 menit = ditolak sementara.
-- Prasyarat: CORE_User
-- =========================================================
CREATE TABLE IF NOT EXISTS "TRN_TokenGagal" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES "CORE_User" (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_trn_tokengagal_user
    ON "TRN_TokenGagal" (user_id, created_at);

-- =========================================================
-- TRN_RemedialUjian
-- Izin remedial dari guru untuk satu siswa pada satu ujian.
-- Siswa memakai izin ini dengan memasukkan token dan menekan Mulai Remedial:
-- percobaan_id terisi dengan percobaan remedial yang dibuat.
--   * izin menunggu  = percobaan_id kosong dan dibatalkan_at kosong (satu per siswa per ujian)
--   * izin dibatalkan guru sebelum dipakai = dibatalkan_at terisi (kuota kembali)
--   * percobaan remedial direset guru -> percobaan_id dikosongkan lagi (izin terbuka kembali)
-- Prasyarat: TRN_PercobaanUjian, MST_SoalUjian, CORE_User
-- =========================================================
CREATE TABLE IF NOT EXISTS "TRN_RemedialUjian" (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    soal_ujian_id  UUID NOT NULL REFERENCES "MST_SoalUjian" (id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES "CORE_User" (id) ON DELETE CASCADE,
    remedial_ke    SMALLINT NOT NULL,
    catatan        VARCHAR(200),

    diberikan_oleh UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    diberikan_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    percobaan_id   UUID REFERENCES "TRN_PercobaanUjian" (id) ON DELETE SET NULL,
    digunakan_at   TIMESTAMPTZ,
    dibatalkan_at  TIMESTAMPTZ,

    CONSTRAINT ck_trn_remedialujian_ke CHECK (remedial_ke >= 1)
);

-- Satu izin menunggu per siswa per ujian
CREATE UNIQUE INDEX IF NOT EXISTS uq_trn_remedialujian_menunggu
    ON "TRN_RemedialUjian" (soal_ujian_id, user_id)
    WHERE percobaan_id IS NULL AND dibatalkan_at IS NULL;

-- Satu nomor remedial hanya sekali (yang dibatalkan boleh diberikan lagi)
CREATE UNIQUE INDEX IF NOT EXISTS uq_trn_remedialujian_ke
    ON "TRN_RemedialUjian" (soal_ujian_id, user_id, remedial_ke)
    WHERE dibatalkan_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_trn_remedialujian_percobaan
    ON "TRN_RemedialUjian" (percobaan_id);

-- =========================================================
-- MIGRASI untuk tabel versi pertama (tanpa penilaian, ujian ulang, dan batas token).
-- Aman dijalankan ulang, dan tidak melakukan apa-apa pada instalasi baru.
-- =========================================================
ALTER TABLE "TRN_PercobaanUjian"
    ADD COLUMN IF NOT EXISTS skor_essai   NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS status_nilai VARCHAR(10),
    ADD COLUMN IF NOT EXISTS nilai_akhir  NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS direset_oleh UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS direset_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS alasan_reset VARCHAR(30);

ALTER TABLE "TRN_PercobaanUjian" DROP CONSTRAINT IF EXISTS uq_trn_percobaanujian_user;

ALTER TABLE "TRN_PercobaanUjian" DROP CONSTRAINT IF EXISTS ck_trn_percobaanujian_statusnilai;
ALTER TABLE "TRN_PercobaanUjian" ADD CONSTRAINT ck_trn_percobaanujian_statusnilai
    CHECK (status_nilai IS NULL OR status_nilai IN ('Final', 'Menunggu'));

ALTER TABLE "TRN_PercobaanUjian" DROP CONSTRAINT IF EXISTS ck_trn_percobaanujian_nilai;
ALTER TABLE "TRN_PercobaanUjian" ADD CONSTRAINT ck_trn_percobaanujian_nilai
    CHECK (nilai_akhir IS NULL OR (nilai_akhir >= 0 AND nilai_akhir <= 100));

ALTER TABLE "TRN_JawabanUjian"
    ADD COLUMN IF NOT EXISTS tipe         VARCHAR(5),
    ADD COLUMN IF NOT EXISTS bobot        NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS is_benar     BOOLEAN,
    ADD COLUMN IF NOT EXISTS nilai        NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS catatan      TEXT,
    ADD COLUMN IF NOT EXISTS dinilai_oleh UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS dinilai_at   TIMESTAMPTZ;

ALTER TABLE "TRN_JawabanUjian" DROP CONSTRAINT IF EXISTS ck_trn_jawabanujian_tipe;
ALTER TABLE "TRN_JawabanUjian" ADD CONSTRAINT ck_trn_jawabanujian_tipe
    CHECK (tipe IS NULL OR tipe IN ('PG', 'ESSAI'));

ALTER TABLE "TRN_JawabanUjian" DROP CONSTRAINT IF EXISTS ck_trn_jawabanujian_nilai;
ALTER TABLE "TRN_JawabanUjian" ADD CONSTRAINT ck_trn_jawabanujian_nilai
    CHECK (nilai IS NULL OR (bobot IS NOT NULL AND nilai >= 0 AND nilai <= bobot));

-- Satu siswa hanya satu percobaan AKTIF per ujian (percobaan lama yang direset boleh banyak).
-- Dibuat di sini, setelah kolom is_active pasti ada.
-- Remedial: kolom baru, nilai lama disalin ke nilai_tercatat
ALTER TABLE "TRN_PercobaanUjian"
    ADD COLUMN IF NOT EXISTS nilai_tercatat NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS jenis          VARCHAR(10) NOT NULL DEFAULT 'Utama',
    ADD COLUMN IF NOT EXISTS remedial_ke    SMALLINT NOT NULL DEFAULT 0;

UPDATE "TRN_PercobaanUjian" SET nilai_tercatat = nilai_akhir
 WHERE nilai_tercatat IS NULL AND nilai_akhir IS NOT NULL;

ALTER TABLE "TRN_PercobaanUjian" DROP CONSTRAINT IF EXISTS ck_trn_percobaanujian_tercatat;
ALTER TABLE "TRN_PercobaanUjian" ADD CONSTRAINT ck_trn_percobaanujian_tercatat
    CHECK (nilai_tercatat IS NULL OR (nilai_tercatat >= 0 AND nilai_tercatat <= 100));

ALTER TABLE "TRN_PercobaanUjian" DROP CONSTRAINT IF EXISTS ck_trn_percobaanujian_jenis;
ALTER TABLE "TRN_PercobaanUjian" ADD CONSTRAINT ck_trn_percobaanujian_jenis
    CHECK (jenis IN ('Utama', 'Remedial') AND remedial_ke >= 0
           AND ((jenis = 'Utama') = (remedial_ke = 0)));

-- Satu percobaan aktif per siswa per ujian PER NOMOR remedial (percobaan awal dan remedial
-- boleh aktif bersamaan). Dibuat di sini, setelah kolom is_active dan remedial_ke pasti ada.
DROP INDEX IF EXISTS uq_trn_percobaanujian_aktif;
CREATE UNIQUE INDEX uq_trn_percobaanujian_aktif
    ON "TRN_PercobaanUjian" (soal_ujian_id, user_id, remedial_ke)
    WHERE is_active;

-- Percobaan yang sudah dikumpulkan dengan versi pertama tidak punya rincian nilai per soal,
-- jadi tidak bisa dinilai ulang. Kalau itu hanya data uji, hapus saja:
--   DELETE FROM "TRN_PercobaanUjian";
