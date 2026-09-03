"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface TemplateRaporDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
}

export function TemplateRaporDialog({
  open,
  onOpenChange,
  initialData,
}: TemplateRaporDialogProps) {
  const [formData, setFormData] = React.useState({
    title: initialData?.title || "",
    type: initialData?.type || "SEMESTER", // SEMESTER | TENGAH_SEMESTER
    paperSize: initialData?.paperSize || "A4",
    orientation: initialData?.orientation || "PORTRAIT",
    headerTitle: initialData?.headerTitle || "RAPOR HASIL BELAJAR SISWA",
    showLogo: true,
    showKopSekolah: true,
    includeCover: true,
    coverLayout: "STANDARD", // STANDARD | MINIMALIS | FORMAL
    showTTDWaliKelas: true,
    showTTDKepsek: true,
    showTTDOrangTua: true,
    showCatatanWaliKelas: true,
    showEkstrakurikuler: true,
    showKehadiran: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Data Template Disimpan:", formData)
    // TODO: Panggil API / Prisma mutation di sini
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Template Rapor" : "Buat Template Rapor Baru"}
          </DialogTitle>
          <DialogDescription>
            Atur tata letak header, cover, dan komponen penilaian untuk rapor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          <Tabs defaultValue="umum" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="umum">Informasi Umum</TabsTrigger>
              <TabsTrigger value="cover">Desain Cover</TabsTrigger>
              <TabsTrigger value="header">Header & Kop</TabsTrigger>
              <TabsTrigger value="komponen">Komponen Isi</TabsTrigger>
            </TabsList>

            {/* TAB 1: INFORMASI UMUM */}
            <TabsContent value="umum" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Nama Template</Label>
                <Input
                  id="title"
                  placeholder="Contoh: Rapor Kurikulum Merdeka - Semester Ganjil"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Jenis Rapor</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) =>
                      setFormData({ ...formData, type: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEMESTER">Rapor Akhir Semester</SelectItem>
                      <SelectItem value="TENGAH_SEMESTER">
                        Rapor Tengah Semester (PTS/STS)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Ukuran Kertas</Label>
                  <Select
                    value={formData.paperSize}
                    onValueChange={(val) =>
                      setFormData({ ...formData, paperSize: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ukuran Kertas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="F4">F4 / Folio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: DESAIN COVER */}
            <TabsContent value="cover" className="space-y-4 mt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCover"
                  checked={formData.includeCover}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      includeCover: Boolean(checked),
                    })
                  }
                />
                <Label htmlFor="includeCover">Gunakan Halaman Cover</Label>
              </div>

              {formData.includeCover && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="grid gap-2">
                    <Label>Layout Cover</Label>
                    <Select
                      value={formData.coverLayout}
                      onValueChange={(val) =>
                        setFormData({ ...formData, coverLayout: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STANDARD">
                          Standard (Logo Atas, Info Siswa Tengah)
                        </SelectItem>
                        <SelectItem value="MINIMALIS">
                          Minimalis (Frame Garis Tipis)
                        </SelectItem>
                        <SelectItem value="FORMAL">
                          Formal (Logo Garuda / Yayasan di Tengah)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cover akan secara otomatis mengambil data identitas siswa, NISN,
                    dan nama sekolah dari database.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: HEADER & KOP */}
            <TabsContent value="header" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="headerTitle">Judul Header Rapor</Label>
                <Input
                  id="headerTitle"
                  value={formData.headerTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, headerTitle: e.target.value })
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showKopSekolah"
                    checked={formData.showKopSekolah}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        showKopSekolah: Boolean(checked),
                      })
                    }
                  />
                  <Label htmlFor="showKopSekolah">
                    Tampilkan Kop Surat Sekolah di Setiap Halaman
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showLogo"
                    checked={formData.showLogo}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showLogo: Boolean(checked) })
                    }
                  />
                  <Label htmlFor="showLogo">
                    Tampilkan Logo Sekolah pada Header
                  </Label>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: KOMPONEN ISI & TTD */}
            <TabsContent value="komponen" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Komponen Tambahan Dalam Rapor:
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showEkstra"
                      checked={formData.showEkstrakurikuler}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          showEkstrakurikuler: Boolean(checked),
                        })
                      }
                    />
                    <Label htmlFor="showEkstra">Tabel Ekstrakurikuler</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showKehadiran"
                      checked={formData.showKehadiran}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          showKehadiran: Boolean(checked),
                        })
                      }
                    />
                    <Label htmlFor="showKehadiran">
                      Tabel Rekap Kehadiran
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showCatatan"
                      checked={formData.showCatatanWaliKelas}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          showCatatanWaliKelas: Boolean(checked),
                        })
                      }
                    />
                    <Label htmlFor="showCatatan">Catatan Wali Kelas</Label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <Label className="text-base font-semibold">
                  Tanda Tangan (Footer):
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ttdOrangTua"
                      checked={formData.showTTDOrangTua}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          showTTDOrangTua: Boolean(checked),
                        })
                      }
                    />
                    <Label htmlFor="ttdOrangTua">Orang Tua / Wali</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ttdWaliKelas"
                      checked={formData.showTTDWaliKelas}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          showTTDWaliKelas: Boolean(checked),
                        })
                      }
                    />
                    <Label htmlFor="ttdWaliKelas">Wali Kelas</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ttdKepsek"
                      checked={formData.showTTDKepsek}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          showTTDKepsek: Boolean(checked),
                        })
                      }
                    />
                    <Label htmlFor="ttdKepsek">Kepala Sekolah</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit">Simpan Template</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}