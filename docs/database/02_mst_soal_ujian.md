# Dokumentasi Komponen Form Pembuatan Soal Ujian (`CreateUjianPage`)

File ini (`page.tsx`) berisi komponen **Next.js 16 (App Router)** untuk halaman pembuatan soal ujian. Komponen ini dirancang menggunakan **Tailwind CSS**, **shadcn/ui**, **Zod**, **Lucide Icons**, dan **Driver.js**.

---

## 🛠️ Ringkasan Fitur

* **Konfigurasi Ujian**: Form interaktif untuk data dasar (Nama Ujian, Mapel, Jenis, Distribusi Kelas, Durasi, KKM, Acak Soal, Tampilkan Hasil).
* **Daftar & Editor Soal**:
  * Mendukung tipe **Pilihan Ganda (PG)** dan **Essai**.
  * Dukungan opsi **Jawaban Banyak** (Multiple Choice) vs **Jawaban Tunggal** pada Pilihan Ganda.
  * *Rich Text Editor* untuk teks pertanyaan.
  * Pengaturan bobot per butir soal.
* **Validasi Form Strict (Zod)**:
  * Memastikan data dasar terisi.
  * Memastikan minimal ada 1 butir soal.
  * Memastikan teks pertanyaan dan opsi PG (A-D) tidak kosong.
  * Memastikan minimal 1 kunci jawaban benar telah dipilih pada soal PG.
  * Otomatis membuka Accordion soal yang memiliki *error* validasi.
* **Fitur Tambahan**:
  * **Onboarding Tour**: Menggunakan `driver.js` untuk memandu pengguna baru.
  * **Preview**: Menyimpan draf ke `sessionStorage` dan membuka halaman pratinjau di tab baru.
  * **Toast Notification**: Menggunakan `sonner` untuk umpan balik *Draft* atau *Terbitkan*.

---

## 📋 Prasyarat Dependency

Pastikan package berikut sudah terpasang di project Next.js Anda:

```bash
npm install driver.js zod sonner lucide-react