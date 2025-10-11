"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  Users,
  Calendar,
  BarChart3,
  Settings,
  FileText,
  Home,
  Star,
  UserCog,
  CreditCard,
  DollarSign,
  Building2,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const NotificationsDropdown = dynamic(
  () => import("@/components/notifications-dropdown").then(mod => ({ default: mod.NotificationsDropdown })),
  { ssr: false }
)

const data = {
  navMain: [
    {
      title: "대시보드",
      url: "/admin/dashboard",
      icon: Home,
    },
    {
      title: "사용자 관리",
      url: "/admin/users",
      icon: UserCog,
    },
    {
      title: "트레이너 관리",
      url: "/admin/trainers",
      icon: Users,
      items: [
        {
          title: "전체 트레이너",
          url: "/admin/trainers",
        },
        {
          title: "승인 대기",
          url: "/admin/trainers?status=pending",
        },
      ],
    },
    {
      title: "센터 관리",
      url: "/admin/centers",
      icon: Building2,
      items: [
        {
          title: "전체 센터",
          url: "/admin/centers",
        },
        {
          title: "승인 대기",
          url: "/admin/centers?status=pending",
        },
      ],
    },
    {
      title: "예약 관리",
      url: "/admin/bookings",
      icon: Calendar,
      items: [
        {
          title: "전체 예약",
          url: "/admin/bookings",
        },
        {
          title: "승인 대기",
          url: "/admin/bookings?status=pending",
        },
        {
          title: "자동 매칭 모니터",
          url: "/admin/bookings/auto-matching",
        },
      ],
    },
    {
      title: "결제 관리",
      url: "/admin/payments",
      icon: CreditCard,
      items: [
        {
          title: "전체 결제",
          url: "/admin/payments",
        },
        {
          title: "결제 완료",
          url: "/admin/payments?status=paid",
        },
        {
          title: "결제 대기",
          url: "/admin/payments?status=pending",
        },
      ],
    },
    {
      title: "정산 관리",
      url: "/admin/settlements",
      icon: DollarSign,
    },
    {
      title: "결제 분석",
      url: "/admin/analytics",
      icon: BarChart3,
    },
    {
      title: "리뷰 관리",
      url: "/admin/reviews",
      icon: Star,
    },
    {
      title: "설정",
      url: "/admin/settings",
      icon: Settings,
      items: [
        {
          title: "알림 설정",
          url: "/admin/settings",
        },
        {
          title: "가격 정책",
          url: "/admin/settings/pricing",
        },
      ],
    },
  ],
}

export function AdminSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: { name: string; email: string; avatar?: string }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <Link href="/" className="flex items-center gap-2 flex-1 hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">시니어 핏</span>
              <span className="truncate text-xs text-muted-foreground">관리자</span>
            </div>
          </Link>
          <NotificationsDropdown />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
