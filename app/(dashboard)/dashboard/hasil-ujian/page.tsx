"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, KeyRound, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Can } from "@/components/access-provider"

export interface Exam {
  id: string
  namaUjian: string
  mataPelajaran: string
  jenis: "UH" | "UTS" | "UAS" | "US"
  token: string
}

export const initialExams: Exam[] = [
  { id: "1", namaUjian: "Penilaian Tengah Semester - Matematika", mataPelajaran: "Matematika", jenis: "UTS", token: "MTK2026" },
  { id: "2", namaUjian: "Ujian Akhir - Fisika Dasar", mataPelajaran: "Fisika", jenis: "UAS", token: "FSK998" },
  { id: "3", namaUjian: "Ulangan Harian 1 - Bahasa Indonesia", mataPelajaran: "Bahasa Indonesia", jenis: "UH", token: "BINDO01" },
  { id: "4", namaUjian: "Ujian Sekolah - Biologi", mataPelajaran: "Biologi", jenis: "US", token: "BIO2026" },
]

export default function HasilUjianPage() {
  const [exams] = React.useState<Exam[]>(initialExams)
  const [search, setSearch] = React.useState("")
  const [sortExam, setSortExam] = React.useState<{ col: keyof Exam | null; dir: "asc" | "desc" }>({
    col: null,
    dir: "asc",
  })
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const handleSortExam = (col: keyof Exam) => {
    setSortExam((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  const processedExams = React.useMemo(() => {
    let result = exams.filter(
      (item) =>
        item.namaUjian.toLowerCase().includes(search.toLowerCase()) ||
        item.mataPelajaran.toLowerCase().includes(search.toLowerCase()) ||
        item.jenis.toLowerCase().includes(search.toLowerCase()) ||
        item.token.toLowerCase().includes(search.toLowerCase())
    )

    if (sortExam.col) {
      result.sort((a, b) => {
        const valA = a[sortExam.col!]
        const valB = b[sortExam.col!]
        const res = valA.localeCompare(valB)
        return sortExam.dir === "asc" ? res : -res
      })
    }
    return result
  }, [exams, search, sortExam])

  const totalPages = Math.ceil(processedExams.length / pageSize) || 1
  const paginatedExams = processedExams.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Hasil Ujian</h1>
        <p className="text-sm text-muted-foreground">Daftar rekapitulasi nilai ujian siswa/i.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          placeholder="Cari nama ujian, mapel, jenis, atau token..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              {(["namaUjian", "mataPelajaran", "jenis", "token"] as const).map((col) => (
                <TableHead key={col}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSortExam(col)}
                    className="-ml-3 h-8"
                  >
                    {col === "namaUjian"
                      ? "Nama Ujian"
                      : col === "mataPelajaran"
                      ? "Mata Pelajaran"
                      : col === "jenis"
                      ? "Jenis"
                      : "Token"}
                    {sortExam.col === col ? (
                      sortExam.dir === "asc" ? (
                        <ArrowUp className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                    )}
                  </Button>
                </TableHead>
              ))}
              <TableHead className="text-center w-[120px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedExams.length ? (
              paginatedExams.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">{item.namaUjian}</TableCell>
                  <TableCell>{item.mataPelajaran}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.jenis}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono gap-1">
                      <KeyRound className="h-3 w-3" />
                      {item.token}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Can code="btn-view">
                      <Link href={`/dashboard/hasil-ujian/${item.id}`}>
                        <Button variant="default" size="sm">
                          <Eye className="mr-1.5 h-4 w-4" /> Show
                        </Button>
                      </Link>
                    </Can>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Data ujian tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Baris per halaman</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                if (v) {
                  setPageSize(Number(v))
                  setPage(1)
                }
              }}
            >
              <SelectTrigger className="h-8 w-[65px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span>
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}