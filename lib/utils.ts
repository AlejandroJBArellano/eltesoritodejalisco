// TesoritoOS - Utility Functions
// Helper functions for formatting and calculations

/**
 * Format currency in Mexican pesos
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

/**
 * Format time from seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Mexico City timezone name
 */
export const MEX_TIMEZONE = "America/Mexico_City";

/**
 * Get current date and time in Mexico City as a string with timezone offset
 * Returns ISO string format but adjusted for MX timezone (e.g., 2024-03-20T10:00:00-06:00)
 */
export function getCurrentCDMXDate(): string {
  const now = new Date();
  
  // Format as YYYY-MM-DDTHH:MM:SS
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEX_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  
  const parts = formatter.formatToParts(now);
  const partMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);

  const iso = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}-06:00`;
  return iso;
}

/**
 * Get current date in Mexico City (YYYY-MM-DD)
 */
export function getCurrentCDMXDay(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MEX_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Format date and time for Mexico City display
 */
export function formatDateTime(date: Date | string | number): string {
  if (!date) return "N/A";
  
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: MEX_TIMEZONE,
  }).format(new Date(date));
}

/**
 * Calculate loyalty points from amount
 * $10 MXN = 1 point
 */
export function calculateLoyaltyPoints(amount: number): number {
  return Math.floor(amount / 10);
}

/**
 * Check if order is overdue (more than 15 minutes)
 */
export function isOrderOverdue(
  createdAt: Date,
  thresholdMinutes: number = 15,
): boolean {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMinutes = (now.getTime() - created.getTime()) / 1000 / 60;
  return diffMinutes >= thresholdMinutes;
}

/**
 * Generate unique order number
 */
export function generateOrderNumber(lastNumber: string): string {
  const nextNum = parseInt(lastNumber) + 1;
  return nextNum.toString().padStart(3, "0");
}

/**
 * Calculate tax (16% IVA)
 */
export function calculateTax(subtotal: number, taxRate: number = 0.16): number {
  return subtotal * taxRate;
}

/**
 * Get status color class for Tailwind
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-500",
    PREPARING: "bg-blue-500",
    READY: "bg-green-500",
    DELIVERED: "bg-gray-500",
    PAID: "bg-purple-500",
    CANCELLED: "bg-red-500",
  };
  return colors[status] || "bg-gray-300";
}

/**
 * Validate phone number (Mexican format)
 */
export function isValidMexicanPhone(phone: string): boolean {
  const phoneRegex = /^(\+52)?[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
