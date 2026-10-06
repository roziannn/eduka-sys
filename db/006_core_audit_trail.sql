-- CORE_AuditTrail
-- Satu baris = satu aktivitas yang mengubah sesuatu (login, tambah/ubah data, dsb).
-- Simpan data tanpa perubahan tidak dicatat (diatur di aplikasi: services/audit-trail.service.ts).
-- Prasyarat: CORE_User
CREATE TABLE IF NOT EXISTS "CORE_AuditTrail" (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Pelaku. user_id dikosongkan kalau akun dihapus / tidak dikenal (login gagal dengan email asing),
    -- user_name disimpan sebagai salinan supaya riwayat tetap terbaca. Nama, bukan email.
    user_id     UUID REFERENCES "CORE_User" (id) ON DELETE SET NULL,
    user_name   VARCHAR(150) NOT NULL,

    activity    VARCHAR(100) NOT NULL,   -- contoh: Login Success, Login Failed, Add Menu
    note        TEXT,                    -- contoh: Login Successful, atau rincian field yang berubah

    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_core_audittrail_created_at
    ON "CORE_AuditTrail" (created_at DESC);

CREATE INDEX IF NOT EXISTS ix_core_audittrail_user
    ON "CORE_AuditTrail" (user_id);

CREATE INDEX IF NOT EXISTS ix_core_audittrail_activity
    ON "CORE_AuditTrail" (activity);

-- psql -h 127.0.0.1 -p 5433 -U postgres -d EDUKA_APP -f db/006_core_audit_trail.sql
