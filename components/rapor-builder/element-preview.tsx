import {
  ABSENSI_ROWS,
  IDENTITAS_FIELDS,
  NILAI_COLUMNS,
  resolveCatatanWali,
  resolveHeading,
  resolveKop,
  resolveSection,
  resolveTabelAbsensi,
  resolveTabelNilai,
  resolveTtd,
  type TemplateElement,
  type TextAlign,
} from "@/types/rapor-template"

const ALIGN_CLASS: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const HEADING_SIZE_CLASS = { sm: "text-sm", md: "text-base", lg: "text-xl" } as const

const GRID_COLS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" } as const

// Tampilan elemen di canvas. Data siswa dan nilai hanya contoh, isi sebenarnya diisi saat rapor dibuat.
export function ElementPreview({ element }: { element: TemplateElement }) {
  const { type, props, label } = element

  switch (type) {
    case "kop_sekolah": {
      const p = resolveKop(props)
      return (
        <div className={`${ALIGN_CLASS[p.align]} ${p.garis ? "border-b-2 border-black pb-2" : ""}`}>
          {p.instansi && <p className="font-bold text-sm uppercase">{p.instansi}</p>}
          {p.sekolah && <p className="font-extrabold text-base uppercase">{p.sekolah}</p>}
          {p.alamat && <p className="text-[10px] text-muted-foreground">{p.alamat}</p>}
        </div>
      )
    }

    case "heading": {
      const p = resolveHeading(props, label)
      return (
        <div className={`my-1 ${ALIGN_CLASS[p.align]}`}>
          <h2
            className={`font-bold tracking-wide ${HEADING_SIZE_CLASS[p.size]} ${
              p.uppercase ? "uppercase" : ""
            }`}
          >
            {p.text}
          </h2>
        </div>
      )
    }

    case "section": {
      const p = resolveSection(props)
      const fields = IDENTITAS_FIELDS.filter((f) => p.fields.includes(f.key))
      return (
        <div className="space-y-1">
          {p.judul && <span className="text-xs font-semibold">{p.judul}</span>}
          <div className={`grid ${GRID_COLS[p.columns]} gap-2 text-xs border p-2 bg-muted/10 rounded`}>
            {fields.length ? (
              fields.map((f) => (
                <div key={f.key}>
                  {f.label}: <b>{f.sample}</b>
                </div>
              ))
            ) : (
              <span className="text-muted-foreground">Belum ada kolom identitas dipilih.</span>
            )}
          </div>
        </div>
      )
    }

    case "tabel_nilai": {
      const p = resolveTabelNilai(props)
      const columns = NILAI_COLUMNS.filter((c) => p.columns.includes(c.key))
      const compact = (key: string) => key === "no" || key === "kkm" || key === "nilai" || key === "predikat"
      return (
        <div className="space-y-1">
          {p.title && <span className="text-xs font-semibold">{p.title}</span>}
          <table className="w-full text-[11px] border-collapse border border-foreground/20">
            <thead>
              <tr className="bg-muted/30">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`border p-1 ${compact(c.key) ? "w-12 text-center" : "text-left"}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((c) => (
                  <td key={c.key} className={`border p-1 ${compact(c.key) ? "text-center" : ""}`}>
                    {c.sample}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )
    }

    case "tabel_absensi": {
      const p = resolveTabelAbsensi(props)
      const rows = ABSENSI_ROWS.filter((r) => p.rows.includes(r.key))
      return (
        <div className="space-y-1">
          {p.title && <span className="text-xs font-semibold">{p.title}</span>}
          <table className="w-1/2 text-[11px] border-collapse border border-foreground/20">
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.key}>
                    <td className="border p-1">{r.label}</td>
                    <td className="border p-1 w-20 text-center">{r.sample}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-1 text-muted-foreground">Belum ada baris dipilih.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )
    }

    case "catatan_wali": {
      const p = resolveCatatanWali(props)
      return (
        <div className="border p-2 rounded text-xs space-y-1">
          {p.title && <span className="font-semibold">{p.title}</span>}
          <p className="italic text-muted-foreground">[Catatan wali kelas diisi saat rapor dibuat]</p>
          {Array.from({ length: p.baris - 1 }, (_, i) => (
            <div key={i} className="h-4 border-b border-dotted border-foreground/30" />
          ))}
        </div>
      )
    }

    case "ttd_block": {
      const p = resolveTtd(props)
      const signers = p.signers.filter((s) => s.enabled)
      return (
        <div className="space-y-2 pt-2 text-[11px]">
          {p.showTanggal && (
            <div className="text-right">
              {p.kota ? `${p.kota}, ` : ""}[Tanggal Rapor]
            </div>
          )}
          {signers.length ? (
            <div
              className="grid gap-2 text-center"
              style={{ gridTemplateColumns: `repeat(${signers.length}, minmax(0, 1fr))` }}
            >
              {signers.map((s) => (
                <div key={s.key}>
                  {s.label}
                  <br />
                  <br />
                  <br />
                  ( ............................ )
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Belum ada penandatangan aktif.</p>
          )}
        </div>
      )
    }

    default:
      return null
  }
}
