"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { AdminView } from "@/components/dashboard/admin-dashboard"
import { DashboardSkeleton, WelcomeBanner } from "@/components/dashboard/shared"
import { StudentView } from "@/components/dashboard/student-dashboard"
import { TeacherView } from "@/components/dashboard/teacher-dashboard"
import type { DashboardData } from "@/components/dashboard/types"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

const SUBTITLE = {
  ADMIN: "Ringkasan aktivitas akademik, pengguna, dan hasil ujian di seluruh sekolah.",
  TEACHER: "Pantau ujian yang Anda buat, partisipasi siswa, dan penilaian yang menunggu.",
  STUDENT: "Lihat ujian yang perlu dikerjakan dan perkembangan nilai Anda.",
}

const LABEL = {
  ADMIN: "Dashboard Administrator",
  TEACHER: "Dashboard Guru",
  STUDENT: "Dashboard Siswa",
}

export default function DashboardPage() {
  const [hari, setHari] = React.useState(14)

  const { data, isLoading, isFetching, error, refetch } = useQuery<DashboardData>({
    queryKey: ["dashboard", hari],
    queryFn: () => fetchJson<DashboardData>(`/api/dashboard?hari=${hari}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000, // data ujian berubah terus, perbarui tiap menit
  })

  React.useEffect(() => {
    if (error) toast.error(`Gagal memuat dashboard: ${getErrorMessage(error)}`)
  }, [error])

  if (isLoading) return <DashboardSkeleton />
  if (!data) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Dashboard tidak dapat dimuat.{" "}
        <button type="button" className="underline" onClick={() => refetch()}>
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <WelcomeBanner
        nama={data.nama}
        label={LABEL[data.role]}
        subtitle={SUBTITLE[data.role]}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />
      {data.role === "ADMIN" && <AdminView data={data} onHariChange={setHari} />}
      {data.role === "TEACHER" && <TeacherView data={data} onHariChange={setHari} />}
      {data.role === "STUDENT" && <StudentView data={data} />}
    </div>
  )
}
