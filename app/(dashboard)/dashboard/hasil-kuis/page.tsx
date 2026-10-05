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

export interface Kuis {
  id: string
  namaKuis: string
  mataPelajaran: string
  token: string
}

export const initialQuizzes: Kuis[] = [
  { id: "k-1", namaKuis: "Kuis Persamaan Kuadrat", mataPelajaran: "Matematika", token: "KUISMATH" },
  { id: "k-2", namaKuis: "Kuis Hukum Newton", mataPelajaran: "Fisika", token: "KUISFIS" },
  { id: "k-3", namaKuis: "Kuis Teks Laporan Hasil Observasi", mataPelajaran: "Bahasa Indonesia", token: "KUISBINDO" },
  { id: "k-4", namaKuis: "Kuis Tata Nama Senyawa", mataPelajaran: "Kimia", token: "KUISKIM" },
]

export default function HasilKuisPage() {
  const [quizzes] = React.useState<Kuis[]>(initialQuizzes)
  const [search, setSearch] = React.useState("")
  const [sortQuiz, setSortQuiz] = React.useState<{ col: keyof Kuis | null; dir: "asc" | "desc" }>({
    col: null,
    dir: "asc",
  })

  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const handleSortQuiz = (col: keyof Kuis) => {
    setSortQuiz((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  const processedQuizzes = React.useMemo(() => {
    let result = quizzes.filter(
      (item) =>
        item.namaKuis.toLowerCase().includes(search.toLowerCase()) ||
        item.mataPelajaran.toLowerCase().includes(search.toLowerCase()) ||
        item.token.toLowerCase().includes(search.toLowerCase())
    )

    if (sortQuiz.col) {
      result.sort((a, b) => {
        const valA = a[sortQuiz.col!]
        const valB = b[sortQuiz.col!]
        const res = valA.localeCompare(valB)
        return sortQuiz.dir === "asc" ? res : -res
      })
    }
    return result
  }, [quizzes, search, sortQuiz])

  const totalPages = Math.ceil(processedQuizzes.length / pageSize) || 1
  const paginatedQuizzes = processedQuizzes.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Hasil Kuis</h1>
        <p className="text-sm text-muted-foreground">
          Daftar rekapitulasi nilai kuis latihan siswa/i.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          placeholder="Cari nama kuis, mapel, atau token..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
      </div>

      {/* Tabel Utama */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              {(["namaKuis", "mataPelajaran", "token"] as const).map((col) => (
                <TableHead key={col}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSortQuiz(col)}
                    className="-ml-3 h-8"
                  >
                    {col === "namaKuis"
                      ? "Nama Kuis"
                      : col === "mataPelajaran"
                      ? "Mata Pelajaran"
                      : "Token Kuis"}
                    {sortQuiz.col === col ? (
                      sortQuiz.dir === "asc" ? (
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
            {paginatedQuizzes.length ? (
              paginatedQuizzes.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">{item.namaKuis}</TableCell>
                  <TableCell>{item.mataPelajaran}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono gap-1">
                      <KeyRound className="h-3 w-3" />
                      {item.token}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Can code="btn-view">
                      <Link href={`/dashboard/hasil-kuis/${item.id}`}>
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
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Data kuis tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
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