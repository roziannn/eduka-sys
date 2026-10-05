"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeftIcon, Loader2, PrinterIcon } from "lucide-react"
import { buttonVariants, Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QueryProvider } from "@/components/query-provider"
import { ElementPreview } from "@/components/rapor-builder/element-preview"
import {
  API_PATH,
  BUILDER_PATH,
  DRAFT_STORAGE_KEY,
  LIST_PATH,
  PAPER_DIMENSIONS,
  RICH_CONTENT_CLASS,
  htmlOf,
} from "@/components/rapor-builder/shared"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"
import { DEFAULT_PAGE, normalizeOrder, type TemplateContent } from "@/types/rapor-template"

interface PreviewTemplate {
  id?: string
  nama: string
  jenis: string
  konten: TemplateContent
}

const JENIS_LABEL: Record<string, string> = {
  SEMESTER: "Rapor Semester",
  TENGAH_SEMESTER: "Rapor PTS",
}

// Draft dari builder disimpan di localStorage. Isinya tidak dipercaya begitu saja.
function readDraft(): PreviewTemplate | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PreviewTemplate
    if (!data?.konten || !Array.isArray(data.konten.elements)) return null
    return data
  } catch {
    return null
  }
}

export default function PreviewRaporPage() {
  return (
    <QueryProvider>
      <React.Suspense
        fallback={
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
          </div>
        }
      >
        <PreviewRapor />
      </React.Suspense>
    </QueryProvider>
  )
}

function PreviewRapor() {
  const searchParams = useSearchParams()
  const templateId = searchParams.get("id")
  const useDraft = searchParams.get("draft") === "1"

  // localStorage baru ada di browser, jadi dibaca setelah mount
  const [draft, setDraft] = React.useState<PreviewTemplate | null | undefined>(undefined)
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(useDraft ? readDraft() : null)
  }, [useDraft])

  const {
    data: saved,
    isLoading,
    error,
  } = useQuery<PreviewTemplate>({
    queryKey: ["template-rapor", templateId],
    queryFn: () => fetchJson<PreviewTemplate>(`${API_PATH}/${templateId}`),
    enabled: !useDraft && templateId !== null,
    refetchOnWindowFocus: false,
  })

  const template = useDraft ? draft : saved

  if (useDraft ? draft === undefined : isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat preview...
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>
          {error
            ? `Gagal memuat template: ${getErrorMessage(error)}`
            : "Template tidak ditemukan. Buka preview dari builder atau dari daftar template."}
        </p>
        <Link href={LIST_PATH} className="underline underline-offset-4">
          Kembali ke daftar template
        </Link>
      </div>
    )
  }

  const page = { ...DEFAULT_PAGE, ...template.konten.page }
  const elements = normalizeOrder(template.konten.elements)
  const base = PAPER_DIMENSIONS[page.size] ?? PAPER_DIMENSIONS.A4
  const landscape = page.orientation === "landscape"
  const width = landscape ? base.height : base.width
  const height = landscape ? base.width : base.height
  const { top, right, bottom, left } = page.margin

  return (
    <div className="space-y-4">
      {/* Saat dicetak, hanya kertas yang ikut. Sidebar dan header dashboard disembunyikan. */}
      <style>{`
        @page { size: ${page.size} ${page.orientation}; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }
        @media print {
          [data-slot="sidebar-gap"], [data-slot="sidebar-container"],
          [data-slot="sidebar-inset"] > header { display: none !important; }
          [data-slot="sidebar-inset"], [data-slot="sidebar-inset"] > main {
            margin: 0 !important; padding: 0 !important; box-shadow: none !important;
          }
          body { background: #fff !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={templateId && !useDraft ? LIST_PATH : `${BUILDER_PATH}${templateId ? `?id=${templateId}` : ""}`}
            aria-label="Kembali"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">Preview: {template.nama}</h1>
            <p className="text-xs text-muted-foreground">
              Data siswa dan nilai hanya contoh. Isi sebenarnya diisi saat rapor dibuat.
            </p>
          </div>
          <Badge variant="outline">{JENIS_LABEL[template.jenis] ?? template.jenis}</Badge>
          {useDraft && <Badge variant="secondary">Draft belum disimpan</Badge>}
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => window.print()}>
          <PrinterIcon className="h-3.5 w-3.5" /> Cetak / Simpan PDF
        </Button>
      </div>

      <div className="flex justify-center overflow-x-auto rounded-md bg-muted/40 p-6 print:overflow-visible print:bg-transparent print:p-0">
        <div
          style={{
            width: `${width}mm`,
            minHeight: `${height}mm`,
            padding: `${top}mm ${right}mm ${bottom}mm ${left}mm`,
          }}
          className="flex shrink-0 flex-col gap-4 rounded-sm border bg-white p-0 text-black shadow-lg print:!min-h-0 print:!w-auto print:!border-0 print:!p-0 print:shadow-none"
        >
          {elements.length === 0 ? (
            <p className="py-24 text-center text-sm text-muted-foreground">Template masih kosong.</p>
          ) : (
            elements.map((el) =>
              el.type === "textbox" ? (
                <div
                  key={el.id}
                  className={`break-inside-avoid ${RICH_CONTENT_CLASS}`}
                  // HTML dari editor teks, dibersihkan lagi oleh server saat disimpan
                  dangerouslySetInnerHTML={{ __html: htmlOf(el) }}
                />
              ) : (
                <div key={el.id} className="break-inside-avoid">
                  <ElementPreview element={el} />
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  )
}
