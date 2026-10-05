"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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

interface Props {
  element: TemplateElement
  // Gabungkan perubahan ke props elemen
  onChange: (patch: Record<string, unknown>) => void
}

const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: "left", label: "Kiri" },
  { value: "center", label: "Tengah" },
  { value: "right", label: "Kanan" },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <Input
        value={value}
        placeholder={placeholder}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
    </Field>
  )
}

function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <Field label={label}>
      <Select
        value={String(value)}
        onValueChange={(v) => {
          const found = options.find((o) => String(o.value) === v)
          if (found) onChange(found.value)
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue>{options.find((o) => o.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={String(o.value)} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// Daftar centang, hasilnya selalu mengikuti urutan katalog
function CheckList({
  label,
  items,
  selected,
  locked,
  onChange,
}: {
  label: string
  items: readonly { key: string; label: string }[]
  selected: string[]
  // kunci yang tidak boleh dilepas
  locked?: string
  onChange: (next: string[]) => void
}) {
  const toggle = (key: string) =>
    onChange(
      items
        .map((i) => i.key)
        .filter((k) => (k === key ? !selected.includes(k) : selected.includes(k)))
    )

  return (
    <Field label={label}>
      <div className="space-y-1.5 rounded-md border p-2">
        {items.map((i) => (
          <label key={i.key} className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox
              checked={selected.includes(i.key)}
              disabled={i.key === locked}
              onCheckedChange={() => toggle(i.key)}
            />
            {i.label}
          </label>
        ))}
      </div>
    </Field>
  )
}

export function ElementProperties({ element, onChange }: Props) {
  const { type, props, label } = element

  switch (type) {
    case "heading": {
      const p = resolveHeading(props, label)
      return (
        <>
          <TextField label="Isi Teks" value={p.text} onChange={(v) => onChange({ text: v })} />
          <SelectField
            label="Rata Teks"
            value={p.align}
            options={ALIGN_OPTIONS}
            onChange={(v) => onChange({ align: v })}
          />
          <SelectField
            label="Ukuran"
            value={p.size}
            options={[
              { value: "sm", label: "Kecil" },
              { value: "md", label: "Sedang" },
              { value: "lg", label: "Besar" },
            ]}
            onChange={(v) => onChange({ size: v })}
          />
          <SwitchField label="Huruf kapital" checked={p.uppercase} onChange={(v) => onChange({ uppercase: v })} />
        </>
      )
    }

    case "kop_sekolah": {
      const p = resolveKop(props)
      return (
        <>
          <TextField label="Nama Instansi / Yayasan" value={p.instansi} onChange={(v) => onChange({ instansi: v })} />
          <TextField label="Nama Sekolah" value={p.sekolah} onChange={(v) => onChange({ sekolah: v })} />
          <TextField label="Alamat" value={p.alamat} onChange={(v) => onChange({ alamat: v })} />
          <SelectField
            label="Rata Teks"
            value={p.align}
            options={ALIGN_OPTIONS}
            onChange={(v) => onChange({ align: v })}
          />
          <SwitchField label="Garis pemisah" checked={p.garis} onChange={(v) => onChange({ garis: v })} />
        </>
      )
    }

    case "section": {
      const p = resolveSection(props)
      return (
        <>
          <TextField
            label="Judul (opsional)"
            value={p.judul}
            placeholder="Contoh: Identitas Siswa"
            onChange={(v) => onChange({ judul: v })}
          />
          <SelectField
            label="Jumlah Kolom"
            value={p.columns}
            options={[
              { value: 1, label: "1 kolom" },
              { value: 2, label: "2 kolom" },
              { value: 3, label: "3 kolom" },
            ]}
            onChange={(v) => onChange({ columns: v })}
          />
          <CheckList
            label="Data yang ditampilkan"
            items={IDENTITAS_FIELDS}
            selected={p.fields}
            onChange={(next) => onChange({ fields: next })}
          />
        </>
      )
    }

    case "tabel_nilai": {
      const p = resolveTabelNilai(props)
      return (
        <>
          <TextField label="Judul Tabel" value={p.title} onChange={(v) => onChange({ title: v })} />
          <CheckList
            label="Kolom tabel"
            items={NILAI_COLUMNS}
            selected={p.columns}
            locked="mapel"
            onChange={(next) => onChange({ columns: next })}
          />
        </>
      )
    }

    case "tabel_absensi": {
      const p = resolveTabelAbsensi(props)
      return (
        <>
          <TextField label="Judul Tabel" value={p.title} onChange={(v) => onChange({ title: v })} />
          <CheckList
            label="Baris kehadiran"
            items={ABSENSI_ROWS}
            selected={p.rows}
            onChange={(next) => onChange({ rows: next })}
          />
        </>
      )
    }

    case "catatan_wali": {
      const p = resolveCatatanWali(props)
      return (
        <>
          <TextField label="Judul Kotak" value={p.title} onChange={(v) => onChange({ title: v })} />
          <SelectField
            label="Tinggi kotak (baris)"
            value={p.baris}
            options={[1, 2, 3, 4, 5, 6, 8, 10].map((n) => ({ value: n, label: `${n} baris` }))}
            onChange={(v) => onChange({ baris: v })}
          />
        </>
      )
    }

    case "ttd_block": {
      const p = resolveTtd(props)
      const updateSigner = (key: string, patch: Partial<{ label: string; enabled: boolean }>) =>
        onChange({ signers: p.signers.map((s) => (s.key === key ? { ...s, ...patch } : s)) })

      return (
        <>
          <SwitchField
            label="Tampilkan tempat & tanggal"
            checked={p.showTanggal}
            onChange={(v) => onChange({ showTanggal: v })}
          />
          {p.showTanggal && (
            <TextField
              label="Kota"
              value={p.kota}
              placeholder="Contoh: Jakarta"
              onChange={(v) => onChange({ kota: v })}
            />
          )}
          <Field label="Penandatangan">
            <div className="space-y-2 rounded-md border p-2">
              {p.signers.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <Checkbox
                    checked={s.enabled}
                    onCheckedChange={(v) => updateSigner(s.key, { enabled: Boolean(v) })}
                    aria-label={`Tampilkan ${s.label}`}
                  />
                  <Input
                    value={s.label}
                    maxLength={100}
                    onChange={(e) => updateSigner(s.key, { label: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </Field>
        </>
      )
    }

    default:
      return null
  }
}
