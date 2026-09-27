// Pagination
export const DEFAULT_PAGE_SIZE = 12
export const DASHBOARD_PAGE_SIZE = 10

// localStorage keys
export const LS_SAVED_PROPERTIES = "alivia_saved_properties"
export const LS_COMPARE_LIST = "alivia_compare_list"
export const LS_RECENT_SEARCHES = "alivia_recent_searches"
export const LS_AUTH_USER = "alivia_auth_user"
export const LS_MARKETPLACE_CART = "alivia_marketplace_cart"
export const LS_COOKIE_CONSENT = "alivia_cookie_consent"

// Compare limit
export const MAX_COMPARE_ITEMS = 4

// Consultation time slots
export const CONSULTATION_TIME_SLOTS = ["10:00 AM", "11:30 AM", "2:00 PM", "4:00 PM"] as const

// Property status badge styling (Tailwind classes)
export const PROPERTY_STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  pending:  { label: "Pending",  classes: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  rejected: { label: "Rejected", classes: "bg-red-100 text-red-700 border-red-200" },
  verified: { label: "Verified", classes: "bg-green-100 text-green-700 border-green-200" },
  featured: { label: "Featured", classes: "bg-brand-100 text-brand-700 border-brand-200" },
}

// Inquiry status styles
export const INQUIRY_STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  new:     { label: "New",     classes: "bg-blue-100 text-blue-700 border-blue-200" },
  read:    { label: "Read",    classes: "bg-gray-100 text-gray-700 border-gray-200" },
  replied: { label: "Replied", classes: "bg-green-100 text-green-700 border-green-200" },
  closed:  { label: "Closed",  classes: "bg-red-100 text-red-700 border-red-200" },
}

// Booking status styles
export const BOOKING_STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  pending:   { label: "Pending",   classes: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", classes: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", classes: "bg-red-100 text-red-700 border-red-200" },
  completed: { label: "Completed", classes: "bg-gray-100 text-gray-700 border-gray-200" },
}

// Project status styles
export const PROJECT_STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  ongoing:   { label: "Ongoing",   classes: "bg-blue-100 text-blue-700 border-blue-200" },
  upcoming:  { label: "Upcoming",  classes: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Completed", classes: "bg-green-100 text-green-700 border-green-200" },
}
