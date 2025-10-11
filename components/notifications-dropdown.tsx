'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  link: string | null
  is_read: boolean
  created_at: string
}

export function NotificationsDropdown() {
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const supabase = createClient()

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // 알림 소리 재생
  const playNotificationSound = async () => {
    try {
      // AudioContext 재사용 또는 생성
      let ctx = audioContext
      if (!ctx) {
        const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx = new AudioContextConstructor()
        setAudioContext(ctx)
      }

      // AudioContext가 suspended 상태면 resume
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = 800 // 높은 음 (띵~)
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }

  useEffect(() => {
    loadNotifications()

    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('🔔 New notification received:', payload)
          loadNotifications()

          // 소리 재생
          playNotificationSound()

          // 브라우저 알림 표시
          if ('Notification' in window && Notification.permission === 'granted') {
            interface NewNotification {
              id?: string
              title?: string
              message?: string
            }
            const newNotif = payload.new as NewNotification
            new Notification(newNotif.title || '새 알림', {
              body: newNotif.message || '',
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: newNotif.id,
              requireInteraction: false
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data && !error) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    loadNotifications()
  }

  async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false)

    loadNotifications()
  }

  const getNotificationLink = (notification: Notification) => {
    // link 컬럼에 이미 전체 경로가 저장되어 있음
    return notification.link || '#'
  }

  // 드롭다운 열릴 때 AudioContext 초기화 (사용자 제스처)
  const handleDropdownOpen = (open: boolean) => {
    setIsOpen(open)
    if (open && !audioContext) {
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioContextConstructor()
      setAudioContext(ctx)
    }
  }

  // SSR 방지: 클라이언트에서만 렌더링
  if (!mounted) {
    return (
      <Button variant="ghost" className="relative h-14 w-14 p-0 shrink-0 cursor-pointer" disabled>
        <Bell className="h-8 w-8" />
      </Button>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-14 w-14 p-0 shrink-0 cursor-pointer">
          <Bell className="h-8 w-8" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs font-bold"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between text-base">
          <span>알림</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-0 text-sm text-primary"
            >
              모두 읽음
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-base text-muted-foreground">
            알림이 없습니다
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-4 cursor-pointer ${
                  !notification.is_read ? 'bg-muted/50' : ''
                }`}
                onClick={() => {
                  markAsRead(notification.id)
                  const link = getNotificationLink(notification)
                  console.log('🔗 Notification link:', link, 'notification:', notification)
                  if (link !== '#') {
                    window.location.href = link
                  }
                  setIsOpen(false)
                }}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-base">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                    locale: ko
                  })}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
