"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, Clock, RefreshCw, Sparkles, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const TONES = {
  emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
  blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
  amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
  violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
  rose: "text-rose-600 bg-rose-50 dark:bg-rose-950/40",
  cyan: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40",
}

export type Tone = keyof typeof TONES

function greeting(date: Date | null) {
  if (!date) return "Selamat Datang"
  const h = date.getHours()
  if (h >= 3 && h < 11) return "Selamat Pagi"
  if (h >= 11 && h < 15) return "Selamat Siang"
  if (h >= 15 && h < 18) return "Selamat Sore"
  return "Selamat Malam"
}

export function WelcomeBanner({
  nama,
  subtitle,
  label,
  onRefresh,
  refreshing,
}: {
  nama: string
  subtitle: string
  label: string
  onRefresh: () => void
  refreshing: boolean
}) {
  const [time, setTime] = React.useState<Date | null>(null)

  React.useEffect(() => {
    // Jam baru diisi di browser supaya tidak beda dengan hasil render server
    const tick = () => setTime(new Date())
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [])

  const tanggal = time
    ? new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(time)
    : "Memuat tanggal..."
  const jam = time
    ? time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "--:--:--"

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{label}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {greeting(time)}, {nama || "Pengguna"}!
          </h1>
          <p className="max-w-lg text-sm text-emerald-100">{subtitle}</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex min-w-[180px] flex-col items-start justify-center rounded-lg border border-white/10 bg-black/20 p-4 backdrop-blur-md sm:items-end">
            <div className="flex items-center gap-2 text-xs text-emerald-200">
              <Calendar className="h-3.5 w-3.5" />
              <span>{tanggal}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-mono text-2xl font-bold tracking-wider">
              <Clock className="h-5 w-5 animate-pulse text-emerald-300" />
              <span>{jam}</span>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Perbarui data
          </Button>
        </div>
      </div>
    </div>
  )
}

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "emerald",
  href,
}: {
  title: string
  value: React.ReactNode
  hint?: string
  icon: LucideIcon
  tone?: Tone
  href?: string
}) {
  const body = (
    <Card
      className={cn("h-full shadow-xs transition-all", href && "hover:-translate-y-0.5 hover:shadow-md hover:ring-foreground/20")}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={cn("rounded-md p-1.5", TONES[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  )
}

export function ChartCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn("shadow-xs", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold">{title}</CardTitle>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export const RENTANG = [7, 14, 30]

export function RangeToggle({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {RENTANG.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "rounded px-2 py-0.5 text-xs transition-colors",
            value === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {r} hari
        </button>
      ))}
    </div>
  )
}

export function formatTanggalSingkat(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d))
}

export function StatusBadge({ status }: { status: string }) {
  const style: Record<string, string> = {
    Tuntas: "bg-emerald-600 text-white",
    "Bisa Dikerjakan": "bg-blue-600 text-white",
    "Sedang Mengerjakan": "bg-amber-500 text-white",
    "Belum Tuntas": "bg-rose-600 text-white",
  }
  if (style[status]) return <Badge className={style[status]}>{status}</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
