"use client"

import * as React from "react"
import {
  Users,
  GraduationCap,
  FileCheck2,
  Clock,
  Calendar,
  Sparkles,
  ArrowUpRight,
  BookOpen,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DashboardPage() {
  const [time, setTime] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Menentukan Ucapan (Pagi / Siang / Sore / Malam)
  const getGreeting = () => {
    if (!time) return "Selamat Datang"
    const hours = time.getHours()
    if (hours >= 3 && hours < 11) return "Selamat Pagi"
    if (hours >= 11 && hours < 15) return "Selamat Siang"
    if (hours >= 15 && hours < 18) return "Selamat Sore"
    return "Selamat Malam"
  }

  // Format Tanggal Indonesia
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date)
  }

  // Format Jam Digital (HH:mm:ss)
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* BANNER WELCOME & REAL-TIME CLOCK */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Eduka LMS & CBT Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {getGreeting()}, Admin!
            </h1>
            <p className="text-sm text-emerald-100 max-w-lg">
              Sistem berjalan optimal. Berikut rekapitulasi data aktivitas akademik hari ini.
            </p>
          </div>

          {/* WIDGET JAM & TANGGAL */}
          <div className="flex flex-col items-start sm:items-end justify-center bg-black/20 backdrop-blur-md p-4 rounded-lg border border-white/10 min-w-[180px]">
            <div className="flex items-center gap-2 text-xs text-emerald-200">
              <Calendar className="h-3.5 w-3.5" />
              <span>{time ? formatDate(time) : "Memuat tanggal..."}</span>
            </div>
            <div className="flex items-center gap-2 text-2xl font-mono font-bold tracking-wider mt-0.5">
              <Clock className="h-5 w-5 text-emerald-300 animate-pulse" />
              <span>{time ? formatTime(time) : "--:--:--"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Siswa
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">850</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 text-emerald-600">
              <ArrowUpRight className="h-3 w-3" /> +12% dibanding semester lalu
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Guru
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground mt-1">Aktif mengajar</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ujian Aktif
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">Sedang berlangsung</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mata Pelajaran
            </CardTitle>
            <BookOpen className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground mt-1">Terdaftar di sistem</p>
          </CardContent>
        </Card>
      </div>

      {/* TABEL AKTIVITAS TERBARU */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Aktivitas Ujian Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Ujian</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Peserta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">PTS Matematika Kelas 10</TableCell>
                  <TableCell>Matematika</TableCell>
                  <TableCell><Badge variant="outline">UTS</Badge></TableCell>
                  <TableCell><Badge className="bg-emerald-600">Berlangsung</Badge></TableCell>
                  <TableCell className="text-right font-mono">120 Siswa</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">UH 1 Bahasa Indonesia</TableCell>
                  <TableCell>Bahasa Indonesia</TableCell>
                  <TableCell><Badge variant="outline">UH</Badge></TableCell>
                  <TableCell><Badge variant="secondary">Selesai</Badge></TableCell>
                  <TableCell className="text-right font-mono">35 Siswa</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Ujian Akhir Fisika Dasar</TableCell>
                  <TableCell>Fisika</TableCell>
                  <TableCell><Badge variant="outline">UAS</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-amber-600 border-amber-600">Terjadwal</Badge></TableCell>
                  <TableCell className="text-right font-mono">90 Siswa</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}