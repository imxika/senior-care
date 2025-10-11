"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  Calendar,
  Users,
  DollarSign,
  Settings,
  Home,
  ClipboardList,
  Bell,
  CreditCard,
  Shield,
  Star,
  Clock,
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
      url: "/trainer/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "예약 관리",
      url: "/trainer/bookings",
      icon: Calendar,
      items: [
        {
          title: "전체 예약",
          url: "/trainer/bookings",
        },
        {
          title: "오늘 일정",
          url: "/trainer/bookings?view=today",
        },
        {
          title: "승인 대기",
          url: "/trainer/bookings?status=pending",
        },
      ],
    },
    {
      title: "클래스 (클래스용)",
      url: "/trainer/programs",
      icon: ClipboardList,
    },
    {
      title: "리뷰 관리",
      url: "/trainer/reviews",
      icon: Star,
    },
    {
      title: "수입 관리",
      url: "/trainer/earnings",
      icon: DollarSign,
    },
    {
      title: "설정",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "프로필",
          url: "/trainer/settings/profile",
        },
        {
          title: "가능시간 관리",
          url: "/trainer/settings/availability",
        },
        {
          title: "센터 관리",
          url: "/trainer/settings/center",
        },
        {
          title: "가격 설정",
          url: "/trainer/settings/pricing",
        },
        {
          title: "알림",
          url: "/trainer/settings/notifications",
        },
        {
          title: "계좌 정보",
          url: "/trainer/settings/billing",
        },
        {
          title: "보안",
          url: "/trainer/settings/security",
        },
      ],
    },
  ],
}

export function TrainerSidebar({
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
              <span className="truncate text-xs text-muted-foreground">트레이너</span>
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
