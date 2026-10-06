// Bentuk respons GET /api/dashboard, diambil langsung dari service supaya selalu sinkron.
// import type dihapus saat kompilasi, jadi kode server tidak ikut ke bundle browser.
import type { dashboardService } from "@/services/dashboard.service"

export type AdminDashboard = Awaited<ReturnType<typeof dashboardService.admin>>
export type TeacherDashboard = Awaited<ReturnType<typeof dashboardService.guru>>
export type StudentDashboard = Awaited<ReturnType<typeof dashboardService.siswa>>
export type DashboardData = AdminDashboard | TeacherDashboard | StudentDashboard
