"use client"

import * as React from "react"
import { Shield, GraduationCap, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { login } from "@/app/login/actions"

type Role = "ADMINISTRATOR" | "GURU" | "SISWA"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [selectedRole, setSelectedRole] = React.useState<Role>("GURU")
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const formData = new FormData(event.currentTarget)
    // Sisipkan peran yang dipilih ke dalam FormData
    formData.append("role", selectedRole)

    const result = await login(formData)

    if (result?.error) {
      setErrorMsg(result.error)
      setLoading(false)
    }
  }

  const roleOptions = [
    {
      id: "GURU" as Role,
      label: "Guru",
      icon: GraduationCap,
    },
    {
      id: "SISWA" as Role,
      label: "Siswa",
      icon: UserCheck,
    },
    {
      id: "ADMINISTRATOR" as Role,
      label: "Admin",
      icon: Shield,
    },
  ]

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Pilih peran Anda dan masukkan akun untuk masuk
          </p>
        </div>

        {/* PILIHAN ROLE (ADMIN, GURU, SISWA) */}
        <Field className="space-y-1.5">
          <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Masuk Sebagai
          </FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {roleOptions.map((role) => {
              const Icon = role.icon
              const isSelected = selectedRole === role.id

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{role.label}</span>
                </button>
              )
            })}
          </div>
        </Field>

        {errorMsg && (
          <div className="rounded-md bg-destructive/15 p-3 text-center text-xs font-medium text-destructive">
            {errorMsg}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">
            {selectedRole === "SISWA" ? "NISN / Email Siswa" : "Email"}
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={
              selectedRole === "SISWA"
                ? "siswa@sekolah.sch.id"
                : selectedRole === "GURU"
                ? "guru@sekolah.sch.id"
                : "admin@eduka.id"
            }
            required
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" name="password" type="password" required />
        </Field>

        <Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Logging in..." : `Masuk Sebagai ${selectedRole}`}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}