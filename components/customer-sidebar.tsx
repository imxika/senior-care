"use client"

import * as React from "react"
import {
  Calendar,
  Search,
  Heart,
  Settings,
  Home,
  MessageSquare,
  GraduationCap,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

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
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="h-4 w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Senior Care</span>
              <span className="truncate text-xs text-muted-foreground">고객</span>
            </div>
          </div>
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
