"use client"

import { ChevronRight, Loader2, type LucideIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

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
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null)
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({})

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
    // 페이지 변경 시 로딩 종료
    setLoadingUrl(null)
  }, [pathname])

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault()
    if (url === '#' || url === pathname) return

    setLoadingUrl(url)

    // 전역 로딩 이벤트 발생
    window.dispatchEvent(new Event('navigationStart'))

    // 모바일에서 사이드바 닫기
    if (isMobile) {
      setOpenMobile(false)
    }

    // 약간의 지연을 주어 UI 업데이트가 보이도록
    setTimeout(() => {
      router.push(url)
    }, 50)
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
              open={openMenus[item.title]}
              onOpenChange={(open) => setOpenMenus({ ...openMenus, [item.title]: open })}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
