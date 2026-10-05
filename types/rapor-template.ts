export type ElementType =
  | "heading"
  | "textbox"
  | "section"
  | "kop_sekolah"
  | "tabel_nilai"
  | "tabel_absensi"
  | "catatan_wali"
  | "ttd_block"

export const ELEMENT_TYPES: ElementType[] = [
  "heading",
  "textbox",
  "section",
  "kop_sekolah",
  "tabel_nilai",
  "tabel_absensi",
  "catatan_wali",
  "ttd_block",
]

export const PAPER_SIZES = ["A4", "F4"] as const
export type PaperSize = (typeof PAPER_SIZES)[number]

export const TEMPLATE_JENIS = ["SEMESTER", "TENGAH_SEMESTER"] as const
export type TemplateJenis = (typeof TEMPLATE_JENIS)[number]

export interface TemplateElement {
  id: string
  type: ElementType
  order: number
  label: string
  // Isi properti tergantung tipe elemen, lihat resolveProps. Properti yang kosong memakai nilai default.
  props: Record<string, unknown>
}

export interface TemplatePage {
  size: PaperSize
  orientation: "portrait" | "landscape"
  margin: { top: number; right: number; bottom: number; left: number }
}

export interface TemplateContent {
  schemaVersion: 1
  page: TemplatePage
  elements: TemplateElement[]
}

export const DEFAULT_PAGE: TemplatePage = {
  size: "A4",
  orientation: "portrait",
  margin: { top: 15, right: 15, bottom: 15, left: 15 },
}

export function normalizeOrder(elements: TemplateElement[]): TemplateElement[] {
  return [...elements]
    .sort((a, b) => a.order - b.order)
    .map((el, i) => ({ ...el, order: i + 1 }))
}

// ---------- PROPERTI PER TIPE ELEMEN ----------
export type TextAlign = "left" | "center" | "right"

export interface HeadingProps {
  text: string
  align: TextAlign
  size: "sm" | "md" | "lg"
  uppercase: boolean
}

export interface KopSekolahProps {
  instansi: string
  sekolah: string
  alamat: string
  align: TextAlign
  garis: boolean
}

export const IDENTITAS_FIELDS = [
  { key: "nama", label: "Nama Siswa", sample: "[Nama Siswa]" },
  { key: "nisn", label: "NISN", sample: "[NISN Siswa]" },
  { key: "nis", label: "NIS", sample: "[NIS Siswa]" },
  { key: "kelas", label: "Kelas", sample: "[Nama Kelas]" },
  { key: "semester", label: "Semester", sample: "[Ganjil/Genap]" },
  { key: "tahunAjaran", label: "Tahun Ajaran", sample: "[Tahun Ajaran]" },
  { key: "sekolah", label: "Nama Sekolah", sample: "[Nama Sekolah]" },
] as const

export interface SectionProps {
  judul: string
  columns: 1 | 2 | 3
  fields: string[]
}

export const NILAI_COLUMNS = [
  { key: "no", label: "No", sample: "1" },
  { key: "mapel", label: "Mata Pelajaran", sample: "Matematika" },
  { key: "kkm", label: "KKM", sample: "75" },
  { key: "nilai", label: "Nilai", sample: "88" },
  { key: "predikat", label: "Predikat", sample: "B" },
  { key: "capaian", label: "Capaian Kompetensi", sample: "Menunjukkan penguasaan baik dalam Aljabar" },
] as const

export interface TabelNilaiProps {
  title: string
  columns: string[]
}

export const ABSENSI_ROWS = [
  { key: "sakit", label: "Sakit", sample: "2 hari" },
  { key: "izin", label: "Izin", sample: "1 hari" },
  { key: "alpha", label: "Tanpa Keterangan", sample: "0 hari" },
] as const

export interface TabelAbsensiProps {
  title: string
  rows: string[]
}

export interface CatatanWaliProps {
  title: string
  // jumlah baris tulis untuk catatan
  baris: number
}

export interface TtdSigner {
  key: string
  label: string
  enabled: boolean
}

export interface TtdBlockProps {
  showTanggal: boolean
  kota: string
  signers: TtdSigner[]
}

export interface ElementPropsMap {
  heading: HeadingProps
  kop_sekolah: KopSekolahProps
  section: SectionProps
  tabel_nilai: TabelNilaiProps
  tabel_absensi: TabelAbsensiProps
  catatan_wali: CatatanWaliProps
  ttd_block: TtdBlockProps
}

export const DEFAULT_PROPS: ElementPropsMap = {
  heading: { text: "Judul Baru", align: "center", size: "md", uppercase: true },
  kop_sekolah: {
    instansi: "Pemerintah Kota / Yayasan Pendidikan",
    sekolah: "SMA Negeri 1 Eduka",
    alamat: "Jl. Pendidikan No. 123, Jakarta Selatan",
    align: "center",
    garis: true,
  },
  section: { judul: "", columns: 2, fields: ["nama", "kelas", "nisn", "semester"] },
  tabel_nilai: { title: "Tabel Capaian Nilai Akademik", columns: ["mapel", "nilai", "capaian"] },
  tabel_absensi: { title: "Ketidakhadiran", rows: ["sakit", "izin", "alpha"] },
  catatan_wali: { title: "Catatan Wali Kelas:", baris: 3 },
  ttd_block: {
    showTanggal: false,
    kota: "",
    signers: [
      { key: "ortu", label: "Orang Tua / Wali", enabled: true },
      { key: "wali", label: "Wali Kelas", enabled: true },
      { key: "kepsek", label: "Kepala Sekolah", enabled: true },
    ],
  },
}

const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback)
const oneOf = <T extends string | number>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback
// Daftar kunci yang hanya boleh berisi kunci yang dikenal (template lama atau data rusak jatuh ke default)
const keys = (v: unknown, known: readonly string[], fallback: string[]) =>
  Array.isArray(v) ? known.filter((k) => v.includes(k)) : fallback

// Gabungkan props tersimpan dengan default, supaya template lama tetap tampil utuh.
export function resolveHeading(props: Record<string, unknown>, label: string): HeadingProps {
  const d = DEFAULT_PROPS.heading
  return {
    text: str(props.text, "") || label || d.text,
    align: oneOf(props.align, ["left", "center", "right"] as const, d.align),
    size: oneOf(props.size, ["sm", "md", "lg"] as const, d.size),
    uppercase: bool(props.uppercase, d.uppercase),
  }
}

export function resolveKop(props: Record<string, unknown>): KopSekolahProps {
  const d = DEFAULT_PROPS.kop_sekolah
  return {
    instansi: str(props.instansi, d.instansi),
    sekolah: str(props.sekolah, d.sekolah),
    alamat: str(props.alamat, d.alamat),
    align: oneOf(props.align, ["left", "center", "right"] as const, d.align),
    garis: bool(props.garis, d.garis),
  }
}

export function resolveSection(props: Record<string, unknown>): SectionProps {
  const d = DEFAULT_PROPS.section
  return {
    judul: str(props.judul, d.judul),
    columns: oneOf(props.columns, [1, 2, 3] as const, d.columns),
    fields: keys(props.fields, IDENTITAS_FIELDS.map((f) => f.key), d.fields),
  }
}

export function resolveTabelNilai(props: Record<string, unknown>): TabelNilaiProps {
  const d = DEFAULT_PROPS.tabel_nilai
  return {
    title: str(props.title, d.title),
    columns: keys(props.columns, NILAI_COLUMNS.map((c) => c.key), d.columns),
  }
}

export function resolveTabelAbsensi(props: Record<string, unknown>): TabelAbsensiProps {
  const d = DEFAULT_PROPS.tabel_absensi
  return {
    title: str(props.title, d.title),
    rows: keys(props.rows, ABSENSI_ROWS.map((r) => r.key), d.rows),
  }
}

export function resolveCatatanWali(props: Record<string, unknown>): CatatanWaliProps {
  const d = DEFAULT_PROPS.catatan_wali
  const baris = typeof props.baris === "number" ? Math.round(props.baris) : d.baris
  return { title: str(props.title, d.title), baris: Math.min(Math.max(baris, 1), 10) }
}

export function resolveTtd(props: Record<string, unknown>): TtdBlockProps {
  const d = DEFAULT_PROPS.ttd_block
  const signers = Array.isArray(props.signers)
    ? props.signers.flatMap((s): TtdSigner[] => {
        if (typeof s !== "object" || s === null) return []
        const r = s as Record<string, unknown>
        return typeof r.key === "string" && typeof r.label === "string"
          ? [{ key: r.key, label: r.label, enabled: bool(r.enabled, true) }]
          : []
      })
    : d.signers
  return {
    showTanggal: bool(props.showTanggal, d.showTanggal),
    kota: str(props.kota, d.kota),
    signers: signers.length ? signers : d.signers,
  }
}
