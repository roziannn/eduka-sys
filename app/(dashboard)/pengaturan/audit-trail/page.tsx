"use client"

import * as React from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

interface AuditItem {
  id: string
  nama: string
  aktivitas: string
  catatan: string
  tanggal: string // sudah diformat server: 04 Sep 2026 09:56:15
}

export default function AuditTrailPage() {
  const [search, setSearch] = React.useState("")
  const [keyword, setKeyword] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)

  // Pencarian ke server ditunda sebentar supaya tidak jalan di setiap ketukan
  React.useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-trail", keyword, page, pageSize],
    queryFn: () =>
      fetchJson<{ total: number; items: AuditItem[] }>(
        `/api/audit-trail?search=${encodeURIComponent(keyword)}&page=${page}&pageSize=${pageSize}`
      ),
    placeholderData: keepPreviousData,
  })

  React.useEffect(() => {
    if (error) toast.error(`Gagal memuat audit trail: ${getErrorMessage(error)}`)
  }, [error])

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const failed = (a: string) => a.toLowerCase().includes("failed")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Riwayat aktivitas pengguna di sistem.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, aktivitas, catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">Total: {total} aktivitas</span>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[190px]">Tanggal</TableHead>
              <TableHead className="w-[200px]">Nama</TableHead>
              <TableHead className="w-[200px]">Aktivitas</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length ? (
              items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.tanggal}</TableCell>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell>
                    <Badge variant={failed(r.aktivitas) ? "destructive" : "outline"}>{r.aktivitas}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal break-words text-sm text-muted-foreground">
                    {r.catatan}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Belum ada aktivitas tercatat.
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
                if (v) setPageSize(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span>
              Halaman {Math.min(page, totalPages)} dari {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
