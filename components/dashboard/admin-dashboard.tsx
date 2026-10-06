"use client"

import {
  BookOpen,
  Building2,
  FileCheck2,
  GraduationCap,
  KeyRound,
  PenLine,
  Percent,
  Users,
} from "lucide-react"

import { AreaChart, BarChart, DonutChart, EmptyChart, HBarChart, PALETTE } from "@/components/dashboard/charts"
import { ChartCard, RangeToggle, StatCard, formatTanggalSingkat } from "@/components/dashboard/shared"
import type { AdminDashboard } from "@/components/dashboard/types"
import { UjianTerbaruTable } from "@/components/dashboard/ujian-terbaru"

// Warna batang sebaran nilai: merah (rendah) ke hijau (tinggi)
const BIN_COLORS = ["#e11d48", "#e11d48", "#ea580c", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#059669", "#047857"]

export function AdminView({
  data,
  onHariChange,
}: {
  data: AdminDashboard
  onHariChange: (hari: number) => void
}) {
  const { stats, ringkasan } = data
  const adaNilai = data.sebaranNilai.some((b) => b.value > 0)
  const adaTren = data.tren.some((t) => t.value > 0)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Siswa"
          value={stats.siswa}
          hint="Akun siswa aktif"
          icon={Users}
          tone="emerald"
          href="/pengaturan/akun-pengguna"
        />
        <StatCard
          title="Total Guru"
          value={stats.guru}
          hint="Akun guru aktif"
          icon={GraduationCap}
          tone="blue"
          href="/pengaturan/akun-pengguna"
        />
        <StatCard
          title="Kelas Aktif"
          value={stats.kelas}
          hint={`${stats.mapel} mata pelajaran aktif`}
          icon={Building2}
          tone="violet"
          href="/dashboard/master/data-kelas"
        />
        <StatCard
          title="Ujian Siap"
          value={stats.ujianSiap}
          hint={`${stats.ujianDraft} masih draft`}
          icon={FileCheck2}
          tone="amber"
          href="/dashboard/soal-ujian"
        />
        <StatCard
          title="Token Terbuka"
          value={stats.tokenTerbuka}
          hint="Ujian yang bisa dimasuki sekarang"
          icon={KeyRound}
          tone="cyan"
          href="/dashboard/soal-ujian"
        />
        <StatCard
          title="Sedang Mengerjakan"
          value={stats.sedangMengerjakan}
          hint="Siswa yang ujiannya berjalan"
          icon={BookOpen}
          tone="emerald"
          href="/dashboard/hasil-ujian"
        />
        <StatCard
          title="Perlu Dinilai"
          value={ringkasan.perluDinilai}
          hint="Jawaban essai menunggu guru"
          icon={PenLine}
          tone="rose"
          href="/dashboard/hasil-ujian"
        />
        <StatCard
          title="Ketuntasan"
          value={ringkasan.totalNilai === 0 ? "-" : `${ringkasan.ketuntasan}%`}
          hint={
            ringkasan.rataRata === null
              ? "Belum ada nilai"
              : `Rata-rata nilai ${ringkasan.rataRata} dari ${ringkasan.totalNilai} hasil`
          }
          icon={Percent}
          tone="blue"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Tren Pengumpulan Ujian"
          description="Jumlah ujian yang dikumpulkan siswa per hari"
          action={<RangeToggle value={data.hari} onChange={onHariChange} />}
        >
          {adaTren ? (
            <AreaChart data={data.tren} formatLabel={formatTanggalSingkat} unit=" ujian" />
          ) : (
            <EmptyChart text="Belum ada ujian yang dikumpulkan pada rentang ini" />
          )}
        </ChartCard>

        <ChartCard title="Komposisi Pengguna" description="Akun aktif per role">
          <DonutChart data={data.penggunaPerRole} centerLabel="Pengguna" />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sebaran Nilai" description="Jumlah siswa per rentang nilai (nilai terbaik tiap ujian)">
          {adaNilai ? (
            <BarChart data={data.sebaranNilai} colorOf={(_, i) => BIN_COLORS[i]} unit=" siswa" />
          ) : (
            <EmptyChart text="Belum ada nilai" />
          )}
        </ChartCard>

        <ChartCard title="Rata-rata Nilai per Mata Pelajaran" description="Delapan mapel dengan rata-rata tertinggi" >
          {data.nilaiPerMapel.length > 0 ? (
            <HBarChart data={data.nilaiPerMapel.map((m) => ({ ...m, sub: `${m.jumlah} hasil` }))} max={100} color={PALETTE[1]} />
          ) : (
            <EmptyChart text="Belum ada nilai" />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Isi Kelas" description="Siswa tahun ajaran aktif dibanding kapasitas (garis = kapasitas)">
          {data.siswaPerKelas.length > 0 ? (
            <HBarChart
              data={data.siswaPerKelas}
              color={PALETTE[3]}
              markerOf={(_, i) => data.siswaPerKelas[i].kapasitas}
            />
          ) : (
            <EmptyChart text="Belum ada kelas" />
          )}
        </ChartCard>

        <ChartCard title="Ujian per Jenis" description="Semua ujian yang tercatat di sistem">
          {data.ujianPerJenis.length > 0 ? (
            <BarChart data={data.ujianPerJenis} colorOf={(_, i) => PALETTE[i % PALETTE.length]} unit=" ujian" height={150} />
          ) : (
            <EmptyChart text="Belum ada ujian" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Ujian Terbaru" description="Klik nama ujian untuk melihat hasilnya">
        <UjianTerbaruTable data={data.ujianTerbaru} />
      </ChartCard>
    </>
  )
}
