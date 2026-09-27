import { auth } from "@/auth"
import type {
  ActivityItem,
  BuyerStats,
  ChartDataPoint,
  DashboardStats,
  PropertyStatusPoint,
  SellerStats,
} from "@/types/dashboard.types"
import { httpClient } from "./http-client"

export type AdminDashboardData = {
  stats: DashboardStats
  monthlyListings: ChartDataPoint[]
  inquiryByType: ChartDataPoint[]
  monthlyBookings: ChartDataPoint[]
  propertyStatusByQuarter: PropertyStatusPoint[]
  recentActivity: ActivityItem[]
}

const emptyStats: DashboardStats = {
  totalProperties: 0,
  pendingListings: 0,
  approvedListings: 0,
  verifiedListings: 0,
  featuredListings: 0,
  totalUsers: 0,
  totalSellers: 0,
  totalBuyers: 0,
  totalInquiries: 0,
  newInquiries: 0,
  totalBookings: 0,
  pendingBookings: 0,
  totalProjects: 0,
  revenuePlaceholder: 0,
}

const emptyDashboard: AdminDashboardData = {
  stats: emptyStats,
  monthlyListings: [],
  inquiryByType: [],
  monthlyBookings: [],
  propertyStatusByQuarter: [],
  recentActivity: [],
}

// GET /dashboard/admin returns the flat stat fields alongside the chart
// series and recent-activity feed, all on one object (see backend
// DashboardService#admin). Split them back apart here.
type AdminDashboardResponse = Partial<DashboardStats> & {
  monthlyListings?: ChartDataPoint[]
  inquiryByType?: ChartDataPoint[]
  monthlyBookings?: ChartDataPoint[]
  propertyStatusByQuarter?: PropertyStatusPoint[]
  recentActivity?: ActivityItem[]
}

export async function getDashboardStats(): Promise<{ data: AdminDashboardData }> {
  const session = await auth()
  const token = session?.accessToken
  try {
    const {
      monthlyListings,
      inquiryByType,
      monthlyBookings,
      propertyStatusByQuarter,
      recentActivity,
      ...stats
    } = await httpClient.get<AdminDashboardResponse>("/dashboard/admin", {
      token,
      cache: "no-store",
    })
    return {
      data: {
        stats: { ...emptyStats, ...stats },
        monthlyListings: monthlyListings ?? [],
        inquiryByType: inquiryByType ?? [],
        monthlyBookings: monthlyBookings ?? [],
        propertyStatusByQuarter: propertyStatusByQuarter ?? [],
        recentActivity: recentActivity ?? [],
      },
    }
  } catch {
    // Backend unreachable or unauthorized — return empty so the page still renders.
    return { data: emptyDashboard }
  }
}

export async function getSellerStats(_sellerId: string): Promise<SellerStats> {
  void _sellerId
  const session = await auth()
  const token = session?.accessToken
  try {
    const stats = await httpClient.get<Partial<SellerStats>>("/dashboard/seller", {
      token,
      cache: "no-store",
    })
    return {
      totalListings: stats.totalListings ?? 0,
      activeListings: stats.activeListings ?? 0,
      pendingListings: stats.pendingListings ?? 0,
      rejectedListings: stats.rejectedListings ?? 0,
      totalInquiries: stats.totalInquiries ?? 0,
      newInquiries: stats.newInquiries ?? 0,
      totalBookings: stats.totalBookings ?? 0,
      totalViews: stats.totalViews ?? 0,
    }
  } catch {
    return {
      totalListings: 0,
      activeListings: 0,
      pendingListings: 0,
      rejectedListings: 0,
      totalInquiries: 0,
      newInquiries: 0,
      totalBookings: 0,
      totalViews: 0,
    }
  }
}

export async function getBuyerStats(_buyerId: string): Promise<BuyerStats> {
  void _buyerId
  const session = await auth()
  const token = session?.accessToken
  try {
    const stats = await httpClient.get<{
      savedCount?: number
      savedProperties?: number
      recentSearches?: number
      totalInquiries?: number
      totalBookings?: number
    }>("/dashboard/buyer", {
      token,
      cache: "no-store",
    })
    return {
      savedProperties: stats.savedProperties ?? stats.savedCount ?? 0,
      recentSearches: stats.recentSearches ?? 0,
      totalInquiries: stats.totalInquiries ?? 0,
      totalBookings: stats.totalBookings ?? 0,
    }
  } catch {
    return {
      savedProperties: 0,
      recentSearches: 0,
      totalInquiries: 0,
      totalBookings: 0,
    }
  }
}
