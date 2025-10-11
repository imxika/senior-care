'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { adminCancelBooking } from './actions'
import { toast } from 'sonner'

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setIsLoading(true)
    setError(null)

    const result = await adminCancelBooking(bookingId, '자동 매칭 실패 - Admin 취소')

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      toast.error(result.error)
    } else {
      toast.success('예약이 취소되었습니다')
      setIsLoading(false)
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <AlertTriangle className="h-4 w-4 mr-1" />
          취소
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>예약을 취소하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            이 예약을 취소하면 고객에게 환불이 진행됩니다.
            <br />
            <strong>이 작업은 되돌릴 수 없습니다.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleCancel()
            }}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              '예약 취소'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
