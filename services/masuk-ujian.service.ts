import { ApiError } from "@/lib/api"
import { masukUjianRepository } from "@/repositories/masuk-ujian.repository"

export interface OpsiUjianSiswa {
  id: string
  teks: string
}

// Tanpa kunci jawaban: opsi hanya membawa id dan teks
export interface SoalUjianSiswa {
  id: string
  tipe: "PG" | "ESSAI"
  pertanyaan: string
  bobot: number
  multiJawaban: boolean
  opsi: OpsiUjianSiswa[]
}

export interface UjianSiswa {
  id: string
  nama: string
  mataPelajaran: string
  jenis: string
  tahunAjaran: string
  semester: string
  durasiMenit: number
  acakSoal: boolean
  soal: SoalUjianSiswa[]
}

export interface MasukUjianResult {
  userId: string
  // Jam server (ms), supaya timer tidak bergantung pada jam perangkat siswa
  serverNow: number
  ujian: UjianSiswa
}

type Actor = { id: string; role_normalized: string }

export const masukUjianService = {
  async enter(rawToken: unknown, user: Actor): Promise<MasukUjianResult> {
    const token = typeof rawToken === "string" ? rawToken.trim().toUpperCase() : ""
    if (!token) throw new ApiError(400, "Token wajib diisi")
    if (!/^[A-Z0-9]{4,12}$/.test(token)) {
      throw new ApiError(404, "Token tidak ditemukan")
    }

    const ujian = await masukUjianRepository.findByToken(token)
    if (!ujian) throw new ApiError(404, "Token tidak ditemukan")

    if (ujian.status !== "Siap Ujian" || !ujian.is_open) {
      throw new ApiError(403, "Ujian belum dibuka atau sudah ditutup")
    }

    // Siswa hanya bisa masuk ke ujian untuk kelasnya. Guru dan admin boleh mencoba.
    if (user.role_normalized === "STUDENT") {
      const allowed = await masukUjianRepository.isStudentInTargetKelas(
        user.id,
        ujian.id,
        ujian.tahun_ajaran
      )
      if (!allowed) throw new ApiError(403, "Ujian ini bukan untuk kelas Anda")
    }

    const soal = [...ujian.data_json.soal]
      .sort((a, b) => a.seq - b.seq)
      .map(
        (s): SoalUjianSiswa => ({
          id: s.id,
          tipe: s.tipe,
          pertanyaan: s.pertanyaan,
          bobot: s.bobot,
          multiJawaban: !!s.multiJawaban,
          opsi: [...(s.opsi ?? [])]
            .sort((a, b) => a.seq - b.seq)
            .map((o) => ({ id: o.id, teks: o.teks })),
        })
      )

    return {
      userId: user.id,
      serverNow: Date.now(),
      ujian: {
        id: ujian.id,
        nama: ujian.nama,
        mataPelajaran: ujian.mapel_nama,
        jenis: ujian.jenis,
        tahunAjaran: ujian.tahun_ajaran,
        semester: ujian.semester,
        durasiMenit: ujian.durasi_menit,
        acakSoal: ujian.acak_soal,
        soal,
      },
    }
  },
}
