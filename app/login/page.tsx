"use client"

import Image from "next/image"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-100 p-6 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Gradasi dekoratif */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-400/30 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-300/20 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <div className="w-full rounded-2xl border border-white/60 bg-white/80 p-8 shadow-xl shadow-blue-900/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70">
          <div className="mb-6 flex items-center justify-center gap-4">
            <Image
              src="/logo/eduka.png"
              alt="Eduka Logo"
              width={140}
              height={40}
              className="h-9 w-auto object-contain dark:[filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_8px_rgba(255,255,255,0.45))]"
              priority
            />
            <div className="h-6 w-[1px] bg-border" />
            <Image
              src="/logo/kurikulum.png"
              alt="Kurikulum Merdeka"
              width={40}
              height={40}
              className="h-8 w-auto object-contain dark:[filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_8px_rgba(255,255,255,0.45))]"
            />
            <Image
              src="/logo/pendidikan.png"
              alt="Dinas Pendidikan"
              width={40}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </div>

          <LoginForm />
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Eduka. Seluruh hak dilindungi.
        </p>
      </div>
    </div>
  )
}
