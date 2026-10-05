"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
  Loader2,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

interface TemplateItem {
  id: string
  nama: string
  jenis: "SEMESTER" | "TENGAH_SEMESTER"
  isAktif: boolean
  paperSize: string
  jumlahElemen: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Key yang sama dengan builder, jadi daftar ikut ter-refresh setelah template disimpan
const TEMPLATE_KEY = ["template-rapor"]
const BUILDER_PATH = "/dashboard/master/template-rapor/builder"
const PREVIEW_PATH = "/dashboard/master/template-rapor/preview"

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

export default function TemplateRaporListPage() {
  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery<TemplateItem[]>({
    queryKey: TEMPLATE_KEY,
    queryFn: () => fetchJson<TemplateItem[]>("/api/template-rapor"),
  })

  React.useEffect(() => {
    if (error) {
      toast.error(`Gagal memuat template: ${getErrorMessage(error)}`)
    }
  }, [error])

  return (
    <div className="p-6 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template Rapor</h1>
          <p className="text-sm text-muted-foreground">
            Kelola format, struktur cover, header, dan tata letak pencetakan rapor siswa.
          </p>
        </div>
        <Link
          href={BUILDER_PATH}
          className={buttonVariants({ className: "gap-2" })}
        >
          <PlusIcon className="h-4 w-4" />
          Buat Template Baru
        </Link>
      </div>

      {/* Grid List Template */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat template...
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          {error
            ? "Template tidak dapat dimuat."
            : "Belum ada template rapor. Klik Buat Template Baru untuk memulai."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="relative flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <Badge
                    variant={template.jenis === "SEMESTER" ? "default" : "secondary"}
                    className={template.jenis === "SEMESTER" ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    {template.jenis === "SEMESTER" ? "Akhir Semester" : "Tengah Semester"}
                  </Badge>
                  {template.isAktif ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600 rounded-full px-2.5">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground rounded-full px-2.5">
                      Nonaktif
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-2 line-clamp-2 font-semibold">
                  {template.nama}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Dibuat Oleh:</span>
                    <span className="font-medium text-foreground">{template.createdBy}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Terakhir Diperbarui:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(template.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t pt-4 flex gap-2 justify-end bg-muted/10 rounded-b-xl">
                <Link
                  href={`${BUILDER_PATH}?id=${template.id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "gap-1.5 text-xs bg-background",
                  })}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                  Edit
                </Link>
                <Link
                  href={`${PREVIEW_PATH}?id=${template.id}`}
                  className={buttonVariants({ variant: "secondary", size: "sm", className: "gap-1.5 text-xs" })}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  Preview
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}