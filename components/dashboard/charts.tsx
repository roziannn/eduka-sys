"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Grafik ringan tanpa library: HTML + SVG. Warna kategori tetap supaya sama di semua kartu.
export const PALETTE = ["#059669", "#2563eb", "#d97706", "#7c3aed", "#e11d48", "#0891b2", "#65a30d", "#db2777"]

export function EmptyChart({ text = "Belum ada data" }: { text?: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {text}
    </div>
  )
}

type Point = { label: string; value: number }

// Batang vertikal. Batang yang di-hover disorot dan nilainya tampil di atas grafik.
export function BarChart({
  data,
  color = PALETTE[0],
  height = 180,
  unit = "",
  max,
  colorOf,
}: {
  data: Point[]
  color?: string
  height?: number
  unit?: string
  max?: number
  colorOf?: (p: Point, i: number) => string
}) {
  const [hover, setHover] = React.useState<number | null>(null)
  const top = Math.max(max ?? 0, ...data.map((d) => d.value), 1)
  const shown = hover === null ? null : data[hover]

  return (
    <div className="space-y-2">
      <div className="h-5 text-xs text-muted-foreground">
        {shown ? (
          <>
            <span className="font-medium text-foreground">{shown.label}</span>
            {": "}
            <span className="font-mono">
              {shown.value}
              {unit}
            </span>
          </>
        ) : (
          "Arahkan kursor ke batang untuk melihat nilai"
        )}
      </div>
      <div className="flex items-end gap-1.5" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex h-full flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            tabIndex={0}
          >
            <div
              className={cn(
                "w-full rounded-t-sm transition-all duration-300",
                hover !== null && hover !== i && "opacity-40"
              )}
              style={{
                height: `${(d.value / top) * 100}%`,
                minHeight: d.value > 0 ? 3 : 0,
                background: colorOf ? colorOf(d, i) : color,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex-1 truncate text-center text-[10px] text-muted-foreground" title={d.label}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// Batang horizontal dengan label di kiri; cocok untuk nama panjang (mapel, kelas)
export function HBarChart({
  data,
  color = PALETTE[1],
  unit = "",
  max,
  markerOf,
}: {
  data: (Point & { sub?: string })[]
  color?: string
  unit?: string
  max?: number
  // Garis penanda per baris, misal kapasitas kelas atau KKM
  markerOf?: (p: Point, i: number) => number | undefined
}) {
  const [hover, setHover] = React.useState<number | null>(null)
  const top = Math.max(max ?? 0, ...data.map((d) => d.value), ...data.map((d, i) => markerOf?.(d, i) ?? 0), 1)

  return (
    <div className="space-y-2.5" onMouseLeave={() => setHover(null)}>
      {data.map((d, i) => {
        const marker = markerOf?.(d, i)
        return (
          <div
            key={d.label}
            className={cn("space-y-1 transition-opacity", hover !== null && hover !== i && "opacity-50")}
            onMouseEnter={() => setHover(i)}
          >
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium" title={d.label}>
                {d.label}
              </span>
              <span className="shrink-0 font-mono text-muted-foreground">
                {d.value}
                {unit}
                {d.sub ? ` · ${d.sub}` : ""}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(d.value / top) * 100}%`, background: color }}
              />
              {marker !== undefined && (
                <div
                  className="absolute top-[-2px] h-[14px] w-0.5 rounded bg-foreground/60"
                  style={{ left: `${(marker / top) * 100}%` }}
                  title={`Batas: ${marker}${unit}`}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Donat dengan legenda; hover pada irisan atau legenda menampilkan nilai di tengah
export function DonutChart({ data, centerLabel = "Total" }: { data: Point[]; centerLabel?: string }) {
  const [hover, setHover] = React.useState<number | null>(null)
  const total = data.reduce((a, d) => a + d.value, 0)
  const R = 42
  const C = 2 * Math.PI * R

  const slices = data.map((d, i) => {
    const len = total === 0 ? 0 : (d.value / total) * C
    const before = data.slice(0, i).reduce((a, x) => a + x.value, 0)
    return { ...d, i, len, offset: total === 0 ? 0 : (before / total) * C }
  })
  const active = hover === null ? null : data[hover]

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0" onMouseLeave={() => setHover(null)}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="14" className="stroke-muted" />
          {slices.map((s) => (
            <circle
              key={s.label}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth={hover === s.i ? 17 : 14}
              stroke={PALETTE[s.i % PALETTE.length]}
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={-s.offset}
              className="cursor-pointer transition-all duration-200"
              opacity={hover === null || hover === s.i ? 1 : 0.4}
              onMouseEnter={() => setHover(s.i)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold">{active ? active.value : total}</span>
          <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
            {active ? active.label : centerLabel}
          </span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <li
            key={d.label}
            className={cn(
              "flex items-center justify-between gap-3 rounded px-1.5 py-0.5 transition-colors",
              hover === i && "bg-muted"
            )}
            onMouseEnter={() => setHover(i)}
          >
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              {d.label}
            </span>
            <span className="font-mono text-muted-foreground">
              {d.value}
              {total > 0 && ` (${Math.round((d.value / total) * 100)}%)`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Grafik area/garis. Kolom transparan di atas SVG menangkap hover per titik.
export function AreaChart({
  data,
  color = PALETTE[0],
  height = 180,
  formatLabel = (l: string) => l,
  unit = "",
  guide,
}: {
  data: Point[]
  color?: string
  height?: number
  formatLabel?: (label: string) => string
  unit?: string
  // Garis putus-putus horizontal, misal KKM
  guide?: { value: number; label: string }
}) {
  const [hover, setHover] = React.useState<number | null>(null)
  const id = React.useId()
  const top = Math.max(guide?.value ?? 0, ...data.map((d) => d.value), 1)
  const n = data.length
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100)
  const y = (v: number) => 100 - (v / top) * 100

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ")
  const area = `${line} L${x(n - 1)},100 L${x(0)},100 Z`
  const shown = hover === null ? null : data[hover]

  return (
    <div className="space-y-2">
      <div className="h-5 text-xs text-muted-foreground">
        {shown ? (
          <>
            <span className="font-medium text-foreground">{formatLabel(shown.label)}</span>
            {": "}
            <span className="font-mono">
              {shown.value}
              {unit}
            </span>
          </>
        ) : (
          "Arahkan kursor ke grafik untuk melihat nilai"
        )}
      </div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((g) => (
            <line key={g} x1="0" x2="100" y1={g} y2={g} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {guide && (
            <line
              x1="0"
              x2="100"
              y1={y(guide.value)}
              y2={y(guide.value)}
              stroke="#e11d48"
              strokeDasharray="4 3"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path d={area} fill={`url(#${id})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1="0" y2="100" className="stroke-foreground/30" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {/* Titik sebagai elemen HTML supaya tetap bulat walau SVG diregangkan */}
        {data.map((d, i) => (
          <span
            key={d.label + i}
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background transition-transform"
            style={{
              left: `${x(i)}%`,
              top: `${y(d.value)}%`,
              background: color,
              transform: `translate(-50%, -50%) scale(${hover === i ? 1.4 : n > 16 ? 0 : 1})`,
            }}
          />
        ))}
        <div className="absolute inset-0 flex">
          {data.map((d, i) => (
            <div key={d.label + i} className="h-full flex-1" onMouseEnter={() => setHover(i)} />
          ))}
        </div>
        {guide && (
          <span
            className="pointer-events-none absolute right-0 -translate-y-full rounded bg-background/80 px-1 text-[10px] text-rose-600"
            style={{ top: `${y(guide.value)}%` }}
          >
            {guide.label}
          </span>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0] ? formatLabel(data[0].label) : ""}</span>
        <span>{data[n - 1] ? formatLabel(data[n - 1].label) : ""}</span>
      </div>
    </div>
  )
}
