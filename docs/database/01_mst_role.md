# Dokumentasi Lengkap: Sistem Akun Pengguna & Skema `mst_role`

Dokumen ini berisi spesifikasi teknis lengkap untuk integrasi halaman **Pengaturan Akun Pengguna**, struktur tabel master peran (`mst_role`), serta skrip otomatisasi trigger PostgreSQL pada Supabase Auth.

---

## 1. Arsitektur & Spesifikasi Tabel `mst_role`

Tabel `mst_role` digunakan untuk menyimpan definisi peran (*roles*), deskripsi wewenang, akumulasi jumlah pengguna aktif per role, serta jejak audit (*audit trail*).

### A. Kamus Data (Data Dictionary)

| Nama Kolom    | Tipe Data      | Atribut / Constraint               | Deskripsi                                              |
| :------------ | :------------- | :--------------------------------- | :----------------------------------------------------- |
| `id`          | `UUID`         | `PRIMARY KEY`, `gen_random_uuid()` | Identifier unik untuk setiap record peran.             |
| `code`        | `VARCHAR(50)`  | `UNIQUE`, `NOT NULL`               | Kode unik peran (misal: `ADMINISTRATOR`, `GURU`).      |
| `name`        | `VARCHAR(100)` | `NOT NULL`                         | Nama tampilan peran yang dibaca di antarmuka (UI).     |
| `description` | `TEXT`         | Optional                           | Penjelasan cakupan hak akses dari peran terkait.       |
| `status`      | `VARCHAR(20)`  | `DEFAULT 'Aktif'`, `CHECK`         | Status operasional peran (`Aktif` atau `Nonaktif`).    |
| `total_user`  | `INT`          | `DEFAULT 0`                        | Jumlah akun terdaftar yang menggunakan peran ini.      |
| `created_at`  | `TIMESTAMPTZ`  | `DEFAULT NOW()`                    | Waktu pembuatan record.                                |
| `created_by`  | `UUID`         | Optional / `REFERENCES auth.users` | ID pengguna/admin yang membuat record ini.             |
| `updated_at`  | `TIMESTAMPTZ`  | `DEFAULT NOW()`                    | Waktu pembaruan record terakhir.                       |
| `updated_by`  | `UUID`         | Optional / `REFERENCES auth.users` | ID pengguna/admin yang memperbarui record ini.         |

---

## 2. Kueri SQL Lengkap (DDL, DML & Trigger)

Jalankan seluruh blok kueri SQL di bawah ini pada **SQL Editor** Supabase Dashboard:

```sql
-- ========================================================
-- 1. PEMBUATAN TABEL MASTER ROLE
-- ========================================================
CREATE TABLE IF NOT EXISTS public.mst_role (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  total_user INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ========================================================
-- 2. SEED DATA AWAL ROLE
-- ========================================================
INSERT INTO public.mst_role (code, name, description, status) 
VALUES
  ('ADMINISTRATOR', 'Administrator', 'Akses penuh ke seluruh sistem, manajemen pengguna, dan pengaturan aplikasi.', 'Aktif'),
  ('GURU', 'Guru', 'Akses ke manajemen kelas, penilaian, bank soal, dan jadwal mengajar.', 'Aktif'),
  ('SISWA', 'Siswa', 'Akses ke materi pembelajaran, pengerjaan tugas/ujian, dan nilai hasil belajar.', 'Aktif')
ON CONFLICT (code) DO NOTHING;

-- ========================================================
-- 3. FUNGSI TRIGGER UNTUK KALKULASI USER OTOMATIS
-- ========================================================
CREATE OR REPLACE FUNCTION public.update_role_user_count()
RETURNS TRIGGER AS $$ BEGIN   -- Sinkronisasi hitungan untuk role lama (apabila terjadi UPDATE / DELETE)   IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN     IF OLD.raw_user_meta_data->>'role' IS NOT NULL THEN       UPDATE public.mst_role       SET total_user = (         SELECT COUNT(*)          FROM auth.users          WHERE raw_user_meta_data->>'role' = OLD.raw_user_meta_data->>'role'       ),       updated_at = NOW()       WHERE code = OLD.raw_user_meta_data->>'role';     END IF;   END IF;    -- Sinkronisasi hitungan untuk role baru (apabila terjadi INSERT / UPDATE)   IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN     IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN       UPDATE public.mst_role       SET total_user = (         SELECT COUNT(*)          FROM auth.users          WHERE raw_user_meta_data->>'role' = NEW.raw_user_meta_data->>'role'       ),       updated_at = NOW()       WHERE code = NEW.raw_user_meta_data->>'role';     END IF;   END IF;    RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- 4. PENGIKATAN TRIGGER PADA TABEL auth.users
-- ========================================================
DROP TRIGGER IF EXISTS trigger_update_role_user_count ON auth.users;

CREATE TRIGGER trigger_update_role_user_count
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.update_role_user_count();

-- ========================================================
-- 5. INISIALISASI SINKRONISASI AWAL
-- ========================================================
UPDATE public.mst_role r
SET total_user = (
  SELECT COUNT(*) 
  FROM auth.users u 
  WHERE u.raw_user_meta_data->>'role' = r.code
);