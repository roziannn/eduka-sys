"use client"

import Link from "next/link"
import { ChevronRight, FileCheck2, KeyRound, PenLine, Percent, Star } from "lucide-react"

import { AreaChart, BarChart, EmptyChart, HBarChart, PALETTE } from "@/components/dashboard/charts"
import { ChartCard, RangeToggle, StatCard, formatTanggalSingkat } from "@/components/dashboard/shared"
import type { TeacherDashboard } from "@/components/dashboard/types"
import { UjianTerbaruTable } from "@/components/dashboard/ujian-terbaru"
import { Badge } from "@/components/ui/badge"

const BIN_COLORS = ["#e11d48", "#e11d48", "#ea580c", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#059669", "#047857"]

export function TeacherView({
  data,
  onHariChange,
}: {
  data: TeacherDashboard
  onHariChange: (hari: number) => void
}) {
  const { ringkasan } = data
  const adaNilai = data.sebaranNilai.some((b) => b.value > 0)
  const adaTren = data.tren.some((t) => t.value > 0)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ujian Saya"
          value={ringkasan.totalUjian}
          hint={`${ringkasan.ujianSiap} siap ujian`}
          icon={FileCheck2}
          tone="emerald"
          href="/dashboard/soal-ujian"
        />
        <StatCard
          title="Token Terbuka"
          value={ringkasan.tokenTerbuka}
          hint="Ujian yang sedang bisa dimasuki siswa"
          icon={KeyRound}
          tone="cyan"
          href="/dashboard/soal-ujian"
        />
        <StatCard
          title="Perlu Dinilai"
          value={ringkasan.perluDinilai}
          hint="Jawaban essai menunggu penilaian"
          icon={PenLine}
          tone="rose"
          href="/dashboard/hasil-ujian"
        />
        <StatCard
          title="Rata-rata Nilai"
          value={ringkasan.rataRata ?? "-"}
          hint={
            ringkasan.totalNilai === 0
              ? "Belum ada nilai"
              : `Ketuntasan ${ringkasan.ketuntasan}% dari ${ringkasan.totalNilai} hasil`
          }
          icon={ringkasan.totalNilai === 0 ? Star : Percent}
          tone="blue"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Pengumpulan Ujian Siswa"
          description="Jumlah ujian yang dikumpulkan per hari"
          action={<RangeToggle value={data.hari} onChange={onHariChange} />}
        >
          {adaTren ? (
            <AreaChart data={data.tren} formatLabel={formatTanggalSingkat} unit=" ujian" color={PALETTE[1]} />
          ) : (
            <EmptyChart text="Belum ada ujian yang dikumpulkan pada rentang ini" />
          )}
        </ChartCard>

        <ChartCard title="Perlu Dinilai" description="Essai yang menunggu nilai dari Anda">
          {data.perluDinilai.length === 0 ? (
            <EmptyChart text="Semua jawaban sudah dinilai" />
          ) : (
            <ul className="space-y-2">
              {data.perluDinilai.map((p) => (
                <li key={p.ujianId}>
                  <Link
                    href={`/dashboard/hasil-ujian/${p.ujianId}`}
                    className="group flex items-center justify-between gap-2 rounded-md border p-2.5 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.ujian}</div>
                      <div className="text-xs text-muted-foreground">{p.mapel}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className="bg-rose-600">{p.jumlah} siswa</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Partisipasi per Ujian" description="Siswa yang sudah selesai dibanding total peserta">
          {data.partisipasi.length === 0 ? (
            <EmptyChart text="Belum ada ujian yang siap" />
          ) : (
            <HBarChart
              data={data.partisipasi.map((p) => ({
                label: p.ujian,
                value: p.selesai,
                sub: `${p.selesai}/${p.total} siswa (${p.persen}%)`,
              }))}
              color={PALETTE[0]}
              markerOf={(_, i) => data.partisipasi[i].total}
            />
          )}
        </ChartCard>

        <ChartCard title="Rata-rata Nilai per Ujian" description="Garis = KKM ujian">
          {data.partisipasi.some((p) => p.rataRata !== null) ? (
            <HBarChart
              data={data.partisipasi
                .filter((p) => p.rataRata !== null)
                .map((p) => ({ label: p.ujian, value: p.rataRata as number }))}
              max={100}
              color={PALETTE[1]}
              markerOf={(d) => data.partisipasi.find((p) => p.ujian === d.label)?.kkm}
            />
          ) : (
            <EmptyChart text="Belum ada nilai" />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sebaran Nilai" description="Jumlah siswa per rentang nilai">
          {adaNilai ? (
            <BarChart data={data.sebaranNilai} colorOf={(_, i) => BIN_COLORS[i]} unit=" siswa" />
          ) : (
            <EmptyChart text="Belum ada nilai" />
          )}
        </ChartCard>

        <ChartCard title="Rata-rata per Mata Pelajaran" description="Dari ujian yang Anda buat">
          {data.nilaiPerMapel.length > 0 ? (
            <HBarChart data={data.nilaiPerMapel.map((m) => ({ ...m, sub: `${m.jumlah} hasil` }))} max={100} color={PALETTE[3]} />
          ) : (
            <EmptyChart text="Belum ada nilai" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Ujian Terbaru Saya" description="Klik nama ujian untuk melihat hasilnya">
        <UjianTerbaruTable data={data.ujianTerbaru} />
      </ChartCard>
    </>
  )
}
