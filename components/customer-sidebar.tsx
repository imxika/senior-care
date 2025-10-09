"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  Calendar,
  Search,
  Heart,
  Settings,
  Home,
  MessageSquare,
  GraduationCap,
  CreditCard,
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
      url: "/customer/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "트레이너 찾기",
      url: "/trainers",
      icon: Search,
    },
    {
      title: "내 예약",
      url: "/customer/bookings",
      icon: Calendar,
      items: [
        {
          title: "전체 예약",
          url: "/customer/bookings",
        },
        {
          title: "예정된 예약",
          url: "/customer/bookings?status=upcoming",
        },
        {
          title: "완료된 예약",
          url: "/customer/bookings?status=completed",
        },
      ],
    },
    {
      title: "결제 내역",
      url: "/customer/payments",
      icon: CreditCard,
    },
    {
      title: "찜한 트레이너",
      url: "/customer/favorites",
      icon: Heart,
    },
    {
      title: "리뷰",
      url: "/customer/reviews",
      icon: MessageSquare,
    },
    {
      title: "트레이너 되기",
      url: "/customer/become-trainer",
      icon: GraduationCap,
    },
    {
      title: "설정",
      url: "/customer/settings",
      icon: Settings,
      items: [
        {
          title: "프로필",
          url: "/customer/settings/profile",
        },
        {
          title: "알림",
          url: "/customer/settings/notifications",
        },
        {
          title: "보안",
          url: "/customer/settings/security",
        },
      ],
    },
  ],
}

export function CustomerSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: { name: string; email: string; avatar?: string }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground aspect-square">
              <Home className="size-7" />
            </div>
            <div className="grid flex-1 text-left leading-tight min-w-0">
              <span className="truncate font-semibold text-lg">Senior Care</span>
              <span className="truncate text-base text-muted-foreground">고객</span>
            </div>
          </div>
          <div className="shrink-0">
            <NotificationsDropdown />
          </div>
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
