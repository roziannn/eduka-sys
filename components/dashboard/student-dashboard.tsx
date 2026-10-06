"use client"

import * as React from "react"
import Link from "next/link"
import { Award, BookOpenCheck, CheckCircle2, Clock3, PlayCircle, TrendingUp } from "lucide-react"

import { AreaChart, EmptyChart, HBarChart, PALETTE } from "@/components/dashboard/charts"
import { ChartCard, StatCard, StatusBadge, formatTanggalSingkat } from "@/components/dashboard/shared"
import type { StudentDashboard } from "@/components/dashboard/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

const FILTERS = ["Semua", "Bisa Dikerjakan", "Menunggu Penilaian", "Tuntas", "Belum Tuntas"] as const

export function StudentView({ data }: { data: StudentDashboard }) {
  const { stats, profil } = data
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("Semua")

  const aktif = data.ujian.filter((u) => u.status === "Bisa Dikerjakan" || u.status === "Sedang Mengerjakan")
  const daftar = filter === "Semua" ? data.ujian : data.ujian.filter((u) => u.status === filter)
  const jumlah = (f: (typeof FILTERS)[number]) =>
    f === "Semua" ? data.ujian.length : data.ujian.filter((u) => u.status === f).length

  return (
    <>
      {aktif.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <PlayCircle className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <div className="font-semibold">
                {aktif.length} ujian bisa dikerjakan sekarang
              </div>
              <div className="text-sm text-muted-foreground">
                {aktif.map((u) => u.nama).join(", ")}
              </div>
            </div>
          </div>
          <Button render={<Link href="/dashboard/masuk-ujian" />}>Masuk Ujian</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Kelas"
          value={profil.kelas ?? "-"}
          hint={profil.tahunAjaran ? `${profil.tahunAjaran} · ${profil.semester}` : "Belum terdaftar di kelas"}
          icon={BookOpenCheck}
          tone="violet"
        />
        <StatCard
          title="Rata-rata Nilai"
          value={stats.rataRata ?? "-"}
          hint={stats.selesai === 0 ? "Belum ada nilai" : `Dari ${stats.selesai} ujian`}
          icon={TrendingUp}
          tone="emerald"
          href="/dashboard/rapor-siswa"
        />
        <StatCard
          title="Ujian Tuntas"
          value={`${stats.tuntas}/${stats.selesai}`}
          hint={stats.belumTuntas > 0 ? `${stats.belumTuntas} di bawah KKM` : "Semua nilai mencapai KKM"}
          icon={Award}
          tone="blue"
        />
        <StatCard
          title="Menunggu Penilaian"
          value={stats.menungguPenilaian}
          hint={`${stats.bisaDikerjakan} ujian belum dikerjakan`}
          icon={Clock3}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Perkembangan Nilai"
          description="10 nilai terakhir, urut waktu (garis merah = KKM ujian terakhir)"
        >
          {data.riwayatNilai.length > 0 ? (
            <AreaChart
              data={data.riwayatNilai.map((r) => ({ label: r.label, value: r.value }))}
              formatLabel={(l) => l}
              color={PALETTE[0]}
              guide={{ value: data.riwayatNilai[data.riwayatNilai.length - 1].kkm, label: "KKM" }}
            />
          ) : (
            <EmptyChart text="Nilai akan tampil setelah ujian dinilai" />
          )}
          {data.riwayatNilai.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Terakhir: {formatTanggalSingkat(data.riwayatNilai[data.riwayatNilai.length - 1].tanggal)}
            </p>
          )}
        </ChartCard>

        <ChartCard title="Nilai per Mata Pelajaran" description="Rata-rata dari ujian yang sudah dinilai">
          {data.nilaiPerMapel.length > 0 ? (
            <HBarChart data={data.nilaiPerMapel.map((m) => ({ ...m, sub: `${m.jumlah} ujian` }))} max={100} color={PALETTE[1]} />
          ) : (
            <EmptyChart text="Belum ada nilai" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Ujian Saya" description="Ujian yang ditujukan ke kelas Anda">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {f} <span className="opacity-70">({jumlah(f)})</span>
            </button>
          ))}
        </div>
        {daftar.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada ujian</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Ujian</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Nilai / KKM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daftar.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.nama}</TableCell>
                    <TableCell>{u.mapel}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.jenis}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{u.durasiMenit} mnt</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {u.nilai ?? "-"} / {u.kkm}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ChartCard>

      {stats.selesai > 0 && stats.belumTuntas === 0 && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Hebat! Semua nilai Anda sudah mencapai KKM.
        </p>
      )}
    </>
  )
}
