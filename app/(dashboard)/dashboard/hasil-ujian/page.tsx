"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Can } from "@/components/access-provider"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

// Bentuk data dari GET /api/hasil-ujian
interface UjianHasil {
  id: string
  namaUjian: string
  mataPelajaran: string
  jenis: string
  status: string
  token: string
  tahunAjaran: string
  semester: string
  kkm: number
  totalPeserta: number
  selesai: number
  berjalan: number
  menunggu: number
  perluRemedial: number
  rataRata: number | null
}

type SortKey = "namaUjian" | "mataPelajaran" | "jenis" | "token"

const HASIL_KEY = ["hasil-ujian"]

const HEADERS: { key: SortKey; label: string }[] = [
  { key: "namaUjian", label: "Nama Ujian" },
  { key: "mataPelajaran", label: "Mata Pelajaran" },
  { key: "jenis", label: "Jenis" },
  { key: "token", label: "Token" },
]

export default function HasilUjianPage() {
  const [search, setSearch] = React.useState("")
  const [sort, setSort] = React.useState<{ col: SortKey | null; dir: "asc" | "desc" }>({
    col: null,
    dir: "asc",
  })
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const {
    data: exams = [],
    isLoading,
    error,
  } = useQuery<UjianHasil[]>({
    queryKey: HASIL_KEY,
    queryFn: () => fetchJson<UjianHasil[]>("/api/hasil-ujian"),
  })

  React.useEffect(() => {
    if (error) toast.error(`Gagal memuat hasil ujian: ${getErrorMessage(error)}`)
  }, [error])

  const handleSort = (col: SortKey) => {
    setSort((prev) => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }))
  }

  const processed = React.useMemo(() => {
    const keyword = search.toLowerCase()
    const result = exams.filter(
      (item) =>
        item.namaUjian.toLowerCase().includes(keyword) ||
        item.mataPelajaran.toLowerCase().includes(keyword) ||
        item.jenis.toLowerCase().includes(keyword) ||
        item.token.toLowerCase().includes(keyword)
    )

    if (sort.col) {
      const col = sort.col
      result.sort((a, b) => {
        const res = a[col].localeCompare(b[col])
        return sort.dir === "asc" ? res : -res
      })
    }
    return result
  }, [exams, search, sort])

  const totalPages = Math.ceil(processed.length / pageSize) || 1
  const paginated = processed.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Hasil Ujian</h1>
        <p className="text-sm text-muted-foreground">Daftar rekapitulasi nilai ujian siswa/i.</p>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
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
              {HEADERS.map((h) => (
                <TableHead key={h.key}>
                  <Button variant="ghost" size="sm" onClick={() => handleSort(h.key)} className="-ml-3 h-8">
                    {h.label}
                    {sort.col === h.key ? (
                      sort.dir === "asc" ? (
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
              <TableHead>Pengerjaan</TableHead>
              <TableHead>Rata-rata</TableHead>
              <TableHead className="w-[120px] text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginated.length ? (
              paginated.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                  <TableCell className="font-semibold">
                    {item.namaUjian}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {item.tahunAjaran} ({item.semester})
                    </span>
                  </TableCell>
                  <TableCell>{item.mataPelajaran}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.jenis}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1 font-mono">
                      <KeyRound className="h-3 w-3" />
                      {item.token}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-semibold">{item.selesai}</span> / {item.totalPeserta} selesai
                    {item.berjalan > 0 && (
                      <span className="block text-muted-foreground">{item.berjalan} sedang mengerjakan</span>
                    )}
                    {item.menunggu > 0 && (
                      <Badge variant="outline" className="mt-1 border-amber-300 text-[10px] text-amber-600">
                        {item.menunggu} menunggu penilaian
                      </Badge>
                    )}
                    {item.perluRemedial > 0 && (
                      <Badge variant="outline" className="mt-1 block w-fit border-violet-300 text-[10px] text-violet-600">
                        {item.perluRemedial} perlu remedial
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-bold">{item.rataRata ?? "-"}</TableCell>
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
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
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
