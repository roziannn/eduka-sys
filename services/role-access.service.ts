import { ApiError } from "@/lib/api"
import { roleRepository } from "@/repositories/role.repository"
import {
  roleMenuRepository,
  type FunctionAccessInput,
  type MenuAccessInput,
} from "@/repositories/role-menu.repository"
import { menuService } from "@/services/menu.service"

export type RoleAccessPayload = {
  // Id menu dan sub menu yang diizinkan
  menuIds?: unknown
  // Id button yang diizinkan
  functionIds?: unknown
}

export interface ButtonAccessDto {
  id: string
  code: string
  enabled: boolean
}

export interface SubMenuAccessDto {
  id: string
  namaSubMenu: string
  url: string
  enabled: boolean
  buttons: ButtonAccessDto[]
}

export interface MenuAccessDto {
  id: string
  namaMenu: string
  iconName: string | null
  url: string
  enabled: boolean
  subMenus: SubMenuAccessDto[]
}

const MAX_IDS = 5000
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseIds(raw: unknown, label: string): Set<string> {
  if (raw === undefined) return new Set()
  if (!Array.isArray(raw) || raw.length > MAX_IDS) {
    throw new ApiError(400, `Daftar ${label} tidak valid`)
  }
  const ids = new Set<string>()
  for (const id of raw) {
    if (typeof id !== "string" || !UUID_RE.test(id)) {
      throw new ApiError(400, `Daftar ${label} tidak valid`)
    }
    ids.add(id)
  }
  return ids
}

async function requireRole(roleId: string) {
  const role = await roleRepository.findById(roleId)
  if (!role) throw new ApiError(404, "Role tidak ditemukan")
  return role
}

export const roleAccessService = {
  // Semua menu, sub menu, dan button, lengkap dengan status izin milik role ini
  async get(roleId: string) {
    const role = await requireRole(roleId)

    const [tree, rows] = await Promise.all([
      menuService.list(),
      roleMenuRepository.findByRole(roleId),
    ])

    const menuOn = new Set<string>()
    const buttonOn = new Set<string>()
    for (const r of rows) {
      if (r.function_id === null) {
        if (r.is_active) menuOn.add(r.menu_id)
      } else if (r.is_active_btn) {
        buttonOn.add(r.function_id)
      }
    }

    const menus: MenuAccessDto[] = tree.map((m) => ({
      id: m.id,
      namaMenu: m.namaMenu,
      iconName: m.iconName,
      url: m.url,
      enabled: menuOn.has(m.id),
      subMenus: m.subMenus.map((s) => ({
        id: s.id,
        namaSubMenu: s.namaSubMenu,
        url: s.url,
        enabled: menuOn.has(s.id),
        buttons: s.buttons.map((b) => ({
          id: b.id,
          code: b.code,
          enabled: buttonOn.has(b.id),
        })),
      })),
    }))

    return { role, menus }
  },

  // Daftar yang dikirim = yang diizinkan, sisanya otomatis tidak diizinkan.
  // Aturan berjenjang dijaga di sini: sub menu butuh menu utamanya, button butuh sub menunya.
  async save(roleId: string, payload: RoleAccessPayload, actorId: string) {
    await requireRole(roleId)

    const menuIds = parseIds(payload.menuIds, "menu")
    const functionIds = parseIds(payload.functionIds, "button")

    const tree = await menuService.list()

    const knownMenus = new Set<string>()
    const knownFunctions = new Set<string>()
    for (const m of tree) {
      knownMenus.add(m.id)
      for (const s of m.subMenus) {
        knownMenus.add(s.id)
        for (const b of s.buttons) knownFunctions.add(b.id)
      }
    }
    for (const id of menuIds) {
      if (!knownMenus.has(id)) throw new ApiError(400, "Ada menu yang tidak ditemukan")
    }
    for (const id of functionIds) {
      if (!knownFunctions.has(id)) throw new ApiError(400, "Ada button yang tidak ditemukan")
    }

    const menus: MenuAccessInput[] = []
    const functions: FunctionAccessInput[] = []
    for (const m of tree) {
      const mainOn = menuIds.has(m.id)
      menus.push({ menuId: m.id, active: mainOn })

      for (const s of m.subMenus) {
        const subOn = mainOn && menuIds.has(s.id)
        menus.push({ menuId: s.id, active: subOn })

        for (const b of s.buttons) {
          functions.push({
            menuId: s.id,
            functionId: b.id,
            menuActive: subOn,
            active: subOn && functionIds.has(b.id),
          })
        }
      }
    }

    await roleMenuRepository.save(roleId, menus, functions, actorId)
  },
}
