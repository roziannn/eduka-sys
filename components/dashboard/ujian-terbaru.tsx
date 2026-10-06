"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminDashboard } from "@/components/dashboard/types"

export function UjianTerbaruTable({ data }: { data: AdminDashboard["ujianTerbaru"] }) {
  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Belum ada ujian</div>
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Ujian</TableHead>
            <TableHead>Mata Pelajaran</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="min-w-[140px]">Pengumpulan</TableHead>
            <TableHead className="text-right">Rata-rata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((u) => {
            const pct = u.peserta === 0 ? 0 : Math.round((u.selesai / u.peserta) * 100)
            return (
              <TableRow key={u.id}>
                <TableCell className="font-semibold">
                  <Link href={`/dashboard/hasil-ujian/${u.id}`} className="hover:underline">
                    {u.nama}
                  </Link>
                  <div className="text-xs font-normal text-muted-foreground">{u.kelas.join(", ") || "-"}</div>
                </TableCell>
                <TableCell>{u.mapel}</TableCell>
                <TableCell>
                  <Badge variant="outline">{u.jenis}</Badge>
                </TableCell>
                <TableCell>
                  {u.status !== "Siap Ujian" ? (
                    <Badge variant="secondary">Draft</Badge>
                  ) : u.tokenOpen ? (
                    <Badge className="bg-emerald-600">Token Terbuka</Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-600 text-amber-600">
                      Siap Ujian
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress value={pct} className="gap-0" />
                    <div className="font-mono text-xs text-muted-foreground">
                      {u.selesai}/{u.peserta} siswa
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{u.rataRata ?? "-"}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
