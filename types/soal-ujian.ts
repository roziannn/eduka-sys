export const JENIS_UJIAN = ["UH", "UTS", "UAS", "US"] as const
export type JenisUjian = (typeof JENIS_UJIAN)[number]

export const STATUS_UJIAN = ["Draft", "Siap Ujian"] as const
export type StatusUjian = (typeof STATUS_UJIAN)[number]

export type TipeSoal = "PG" | "ESSAI"

export interface OpsiDb {
  id: string
  seq: number
  teks: string
  benar: boolean
}

export interface SoalDb {
  id: string
  seq: number
  tipe: TipeSoal
  pertanyaan: string 
  bobot: number
  multiJawaban?: boolean // hanya PG
  opsi?: OpsiDb[] // hanya PG
}

export interface UjianDataJson {
  schemaVersion: 1
  soal: SoalDb[]
}

export interface UjianDetail {
  id: string
  nama: string
  mapelId: string
  jenis: JenisUjian
  tahunAjaran: string
  semester: string
  kelasIds: string[]
  durasiMenit: number
  kkm: number
  acakSoal: boolean
  tampilkanHasil: boolean
  status: StatusUjian
  soal: SoalDb[]
}

export interface ReferensiUjian {
  mapel: { id: string; kode: string; nama: string; isAktif: boolean }[]
  kelas: {
    id: string
    namaKelas: string
    tingkat: string
    jurusan: string
    isAktif: boolean
  }[]
  tahunAjaran: { id: string; tahun: string; semester: string; isAktif: boolean }[]
}