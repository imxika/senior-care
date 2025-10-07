"use client"

import { ChevronRight, Loader2, type LucideIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useTransition } from "react"
import { motion } from "framer-motion"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null)
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    // 클라이언트에서만 초기 open 상태 설정
    const initialOpenState: { [key: string]: boolean } = {}
    items.forEach((item) => {
      if (item.items?.some(subItem => pathname.startsWith(subItem.url))) {
        initialOpenState[item.title] = true
      }
    })
    setOpenMenus(initialOpenState)
  }, [pathname, items])

  useEffect(() => {
    // 페이지 변경 시 로딩 종료 (pathname 또는 searchParams 변경 시)
    setLoadingUrl((prev) => {
      // 로딩 중이었고 모바일이면 사이드바 닫기 (별도 effect로 처리)
      if (prev !== null && isMobile) {
        // 다음 tick에 실행하여 렌더링 충돌 방지
        setTimeout(() => setOpenMobile(false), 0)
      }
      return null
    })
  }, [pathname, searchParams, isMobile, setOpenMobile])

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault()

    if (url === '#') return

    // 전체 URL 비교 (쿼리 파라미터 포함)
    const currentFullUrl = `${pathname}${window.location.search}`
    if (url === currentFullUrl) return

    setLoadingUrl(url)

    // startTransition을 사용하여 네비게이션 (Next.js 15 권장 방법)
    // 모바일 사이드바는 페이지 로딩 완료 후 자동으로 닫힘 (useEffect 참조)
    startTransition(() => {
      router.push(url)
    })
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + '/')

          // 하위 메뉴가 없는 경우 일반 링크로 처리
          if (!item.items || item.items.length === 0) {
            const isLoading = loadingUrl === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                  <a href={item.url} onClick={(e) => handleNavigation(e, item.url)}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      item.icon && <item.icon />
                    )}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          // 하위 메뉴가 있는 경우 Collapsible로 처리
          return (
            <Collapsible
              key={item.title}
              asChild
              open={openMenus[item.title] ?? false}
              onOpenChange={(open) => setOpenMenus({ ...openMenus, [item.title]: open })}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <motion.div
                      className="ml-auto"
                      animate={{ rotate: openMenus[item.title] ? 90 : 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.div>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => {
                      const isLoading = loadingUrl === subItem.url
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                            <a href={subItem.url} onClick={(e) => handleNavigation(e, subItem.url)}>
                              {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
