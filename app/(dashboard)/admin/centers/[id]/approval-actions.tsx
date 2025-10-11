'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
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
} from '@/components/ui/alert-dialog'

interface ApprovalActionsProps {
  centerId: string
  centerName: string
}

export function ApprovalActions({ centerId, centerName }: ApprovalActionsProps) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  async function handleApprove() {
    setIsApproving(true)
    try {
      const response = await fetch('/api/admin/centers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '승인 처리에 실패했습니다')
      }

      toast.success('센터가 승인되었습니다', {
        description: `${centerName} 센터가 성공적으로 승인되었습니다.`
      })

      router.refresh()
    } catch (error) {
      console.error('센터 승인 오류:', error)
      toast.error('오류가 발생했습니다', {
        description: error instanceof Error ? error.message : '센터 승인에 실패했습니다'
      })
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      toast.error('거부 사유를 입력해주세요')
      return
    }

    setIsRejecting(true)
    try {
      const response = await fetch('/api/admin/centers/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId,
          reason: rejectionReason
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '거부 처리에 실패했습니다')
      }

      toast.success('센터가 거부되었습니다', {
        description: `${centerName} 센터 등록이 거부되었습니다.`
      })

      setShowRejectDialog(false)
      setRejectionReason('')
      router.push('/admin/centers')
    } catch (error) {
      console.error('센터 거부 오류:', error)
      toast.error('오류가 발생했습니다', {
        description: error instanceof Error ? error.message : '센터 거부에 실패했습니다'
      })
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          승인 처리
        </CardTitle>
        <CardDescription>
          센터 등록 요청을 검토하고 승인 또는 거부할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          {/* 승인 버튼 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <>
                    <span className="mr-2">처리 중...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    승인
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>센터 등록 승인</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{centerName}</strong> 센터를 승인하시겠습니까?
                  <br />
                  승인 후에는 트레이너가 이 센터에서 활동할 수 있으며, 고객에게 공개됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isApproving}>
                  취소
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isApproving ? '처리 중...' : '승인'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 거부 버튼 */}
          <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={isApproving || isRejecting}
              >
                {isRejecting ? (
                  <>
                    <span className="mr-2">처리 중...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    거부
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>센터 등록 거부</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{centerName}</strong> 센터 등록을 거부하시겠습니까?
                  <br />
                  거부 시 트레이너에게 알림이 전송되며, 센터는 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 py-4">
                <Label htmlFor="rejection-reason">거부 사유 *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="센터 등록을 거부하는 이유를 입력해주세요..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  disabled={isRejecting}
                />
                <p className="text-xs text-muted-foreground">
                  거부 사유는 트레이너에게 전달됩니다.
                </p>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isRejecting}
                  onClick={() => setRejectionReason('')}
                >
                  취소
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isRejecting ? '처리 중...' : '거부'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>승인 전 확인사항:</strong> 센터명, 주소, 사업자등록번호가 정확한지 확인하세요.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
