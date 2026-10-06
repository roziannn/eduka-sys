import { formatTanggalJam } from "@/lib/format-date"
import { auditTrailRepository } from "@/repositories/audit-trail.repository"

export type AuditActor = {
  id: string
  full_name?: string | null
  username?: string | null
  name?: string | null
}

const MAX_NOTE = 2000
const MAX_VALUE = 60

// Yang dicatat nama pengguna, bukan email
export const actorName = (a: AuditActor) => a.name || a.full_name || a.username || "-"

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

// "namaKelas" -> "Nama Kelas"
const humanize = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim()

// Kolom bawaan yang berubah setiap simpan dan bukan perubahan isi
const IGNORED = new Set(["id", "createdAt", "createdBy", "updatedAt", "updatedBy", "lastLogin"])

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-"
  if (typeof v === "object") return "(diubah)"
  return clip(String(v), MAX_VALUE)
}

// Bandingkan dua snapshot. Hasil kosong = tidak ada perubahan, jadi tidak perlu dicatat.
export function diffChanges(before: unknown, after: unknown): string[] {
  const a = (before ?? {}) as Record<string, unknown>
  const b = (after ?? {}) as Record<string, unknown>
  const changes: string[] = []

  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (IGNORED.has(key)) continue
    if (JSON.stringify(a[key]) === JSON.stringify(b[key])) continue
    changes.push(`${humanize(key)}: ${show(a[key])} → ${show(b[key])}`)
  }
  return changes
}

// Pencatatan tidak boleh menggagalkan aksi utama: kalau tabel audit bermasalah, cukup dilog.
async function safeLog(userId: string | null, userName: string, activity: string, note: string | null) {
  try {
    await auditTrailRepository.create({
      userId,
      userName,
      activity,
      note: note ? clip(note, MAX_NOTE) : null,
    })
  } catch (err) {
    console.error("Gagal mencatat audit trail", err)
  }
}

export const auditTrailService = {
  log(actor: AuditActor, activity: string, note: string | null = null) {
    return safeLog(actor.id, actorName(actor), activity, note)
  },

  // Untuk pelaku yang belum tentu dikenal, misal login gagal
  logAs(userId: string | null, userName: string, activity: string, note: string | null = null) {
    return safeLog(userId, userName, activity, note)
  },

  // Jalankan perubahan, lalu catat hanya kalau isinya benar-benar berbeda.
  // snapshot dipanggil sebelum dan sesudah, dan harus mengembalikan data yang sama bentuknya.
  async logUpdate<T>(
    actor: AuditActor,
    activity: string,
    target: string,
    snapshot: () => Promise<unknown>,
    run: () => Promise<T>
  ): Promise<T> {
    let before: unknown = null
    try {
      before = await snapshot()
    } catch (err) {
      console.error("Gagal mengambil data sebelum perubahan", err)
    }

    const result = await run()

    try {
      const changes = diffChanges(before, await snapshot())
      // before gagal diambil: catat saja tanpa rincian daripada menghilangkan jejaknya
      if (before === null) await this.log(actor, activity, target)
      else if (changes.length > 0) await this.log(actor, activity, `${target} | ${changes.join("; ")}`)
    } catch (err) {
      console.error("Gagal mencatat audit trail", err)
    }
    return result
  },

  async list(search: string, page: number, pageSize: number) {
    const { rows, total } = await auditTrailRepository.findPage(
      search.trim(),
      pageSize,
      (page - 1) * pageSize
    )
    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        nama: r.user_name,
        aktivitas: r.activity,
        catatan: r.note ?? "-",
        tanggal: formatTanggalJam(r.created_at),
      })),
    }
  },
}
