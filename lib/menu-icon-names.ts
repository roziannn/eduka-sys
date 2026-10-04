// Ikon yang boleh dipilih untuk menu utama. Untuk menambah ikon, tambahkan namanya di sini
// dan komponennya di lib/menu-icons.ts (TypeScript akan menolak kalau salah satunya terlewat).
export const MENU_ICON_NAMES = [
  "LayoutDashboard",
  "Database",
  "FileText",
  "FileCheck2",
  "ClipboardList",
  "ListChecks",
  "FileSpreadsheet",
  "BookOpen",
  "Library",
  "GraduationCap",
  "School",
  "Users",
  "UserCheck",
  "Settings",
  "Settings2",
  "Shield",
  "KeyRound",
  "Layers",
  "Folder",
  "FolderOpen",
  "Calendar",
  "Clock",
  "TrendingUp",
  "Award",
  "Trophy",
  "Printer",
  "Mail",
  "Bell",
  "MessageSquare",
  "Building2",
  "Wallet",
  "Leaf",
] as const

export type MenuIconName = (typeof MENU_ICON_NAMES)[number]

export function isMenuIconName(value: unknown): value is MenuIconName {
  return typeof value === "string" && (MENU_ICON_NAMES as readonly string[]).includes(value)
}