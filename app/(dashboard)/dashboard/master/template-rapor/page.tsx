"use client"

import * as React from "react"
import Link from "next/link"
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Mock Data Template Rapor
const initialTemplates = [
  {
    id: "1",
    title: "Template Rapor Akhir Semester (Kurikulum Merdeka)",
    type: "SEMESTER",
    paperSize: "A4",
    includeCover: true,
    coverLayout: "STANDARD",
    isDefault: true,
    updatedAt: "2026-02-15",
  },
  {
    id: "2",
    title: "Template Rapor Tengah Semester (STS)",
    type: "TENGAH_SEMESTER",
    paperSize: "A4",
    includeCover: false,
    coverLayout: "NONE",
    isDefault: false,
    updatedAt: "2026-01-10",
  },
]

export default function TemplateRaporListPage() {
  const [templates] = React.useState(initialTemplates)

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
        <Button asChild className="gap-2">
          <Link href="/dashboard/master/template-rapor/builder">
            <PlusIcon className="h-4 w-4" />
            Buat Template Baru
          </Link>
        </Button>
      </div>

      {/* Grid List Template */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="relative flex flex-col justify-between">
            <CardHeader>
              <div className="flex justify-between items-start gap-2">
                <Badge
                  variant={
                    template.type === "SEMESTER" ? "default" : "secondary"
                  }
                  className={template.type === "SEMESTER" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {template.type === "SEMESTER"
                    ? "Akhir Semester"
                    : "Tengah Semester"}
                </Badge>
                {template.isDefault && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-600 rounded-full px-2.5">
                    Default
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-2 line-clamp-2 font-semibold">
                {template.title}
              </CardTitle>
              <CardDescription className="text-sm">Ukuran Kertas: {template.paperSize}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Halaman Cover:</span>
                  <span className="font-medium text-foreground">
                    {template.includeCover ? `Ya (${template.coverLayout})` : "Tidak"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Terakhir Diperbarui:</span>
                  <span className="font-medium text-foreground">
                    {template.updatedAt}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t pt-4 flex gap-2 justify-end bg-muted/10 rounded-b-xl">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-background"
                asChild
              >
                <Link href={`/dashboard/master/template-rapor/builder?id=${template.id}`}>
                  <PencilIcon className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => alert("Preview PDF dibuka")}
              >
                <EyeIcon className="h-3.5 w-3.5" />
                Preview
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}