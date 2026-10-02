import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"

export interface RoleData {
  id: string
  code: string
  name: string
  description: string
  total_user: number
  status: "Aktif" | "Nonaktif"
}

const ROLES_KEY = ["roles"]

// di dalam komponen:
const queryClient = useQueryClient()

const { data: roles = [], isLoading } = useQuery<RoleData[]>({
  queryKey: ROLES_KEY,
  queryFn: () => fetchJson<RoleData[]>("/api/roles"),
})

const saveRole = useMutation({
  mutationFn: (input: { id?: string; body: Record<string, unknown> }) =>
    fetchJson(input.id ? `/api/roles/${input.id}` : "/api/roles", {
      method: input.id ? "PUT" : "POST",
      body: input.body,
    }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
})