"use client"

import Image from "next/image"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        {/* Header Logo - Centered */}
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

        {/* Form Section - Centered */}
        <div className="w-full">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}