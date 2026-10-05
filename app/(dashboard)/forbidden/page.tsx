import { ShieldAlert } from "lucide-react"

export default function ForbiddenPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Anda tidak punya akses ke halaman ini</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Hubungi administrator jika Anda merasa seharusnya bisa membukanya. Perubahan
        hak akses baru berlaku setelah Anda login ulang.
      </p>
    </div>
  )
}
