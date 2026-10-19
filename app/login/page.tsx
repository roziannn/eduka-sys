"use client"

import Image from "next/image"
import { ClipboardCheck, Timer, ShieldCheck } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { LoginExamScene } from "@/components/login-exam-scene"

const highlights = [
  { icon: ClipboardCheck, label: "Ujian berbasis komputer" },
  { icon: Timer, label: "Timer & penilaian otomatis" },
  { icon: ShieldCheck, label: "Aman & terpantau" },
]

export default function LoginPage() {
  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      {/* Panel kiri: animasi 3D bertema CBT */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
                <div className="relative z-10">
          <h2 className="text-3xl font-bold leading-tight">
            Computer Based Test
          </h2>
          <p className="mt-2 max-w-sm text-sm text-blue-100">
            Platform ujian digital untuk sekolah: cepat, jujur, dan hasilnya
            langsung terekap.
          </p>
        </div>

        <LoginExamScene className="relative z-0 my-4 min-h-0 flex-1" />

        <ul className="relative z-10 flex flex-wrap gap-3">
          {highlights.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      {/* Panel kanan: form */}
      <div className="relative flex items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-8">
          <div className="flex items-center justify-center gap-4">
            <Image
              src="/logo/eduka.png"
              alt="Eduka Logo"
              width={140}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
            <div className="h-6 w-[1px] bg-border" />
            <Image
              src="/logo/kurikulum.png"
              alt="Kurikulum Merdeka"
              width={40}
              height={40}
              className="h-8 w-auto object-contain"
            />
            <Image
              src="/logo/pendidikan.png"
              alt="Dinas Pendidikan"
              width={40}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="w-full">
            <LoginForm />
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Eduka. Seluruh hak dilindungi.
          </p>
        </div>
      </div>
    </div>
  )
}
