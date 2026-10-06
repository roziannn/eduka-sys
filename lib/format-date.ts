const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

// Contoh hasil: "04 Sep 2026 09:56:15", selalu dalam WIB supaya sama di server dan di browser
export function formatTanggalJam(value: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value))

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("day")} ${BULAN[Number(get("month")) - 1]} ${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`
}
