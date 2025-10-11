'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Trash2, Search, AlertTriangle, Edit, UserPlus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { deleteUserCompletely, updateUser, createProfile } from './actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface User {
  id: string
  email: string | null
  full_name: string | null
  user_type: string
  created_at: string
  last_sign_in_at?: string | null
  customers: Array<Record<string, unknown>>
  trainers: Array<Record<string, unknown>>
  has_profile?: boolean
}

interface Props {
  users: User[]
}

export function UserManagementClient({ users: initialUsers }: Props) {
  const router = useRouter()
  const users = initialUsers
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<'email' | 'full_name' | 'user_type' | 'created_at' | 'last_sign_in_at'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', user_type: '' })
  const [isUpdating, setIsUpdating] = useState(false)
  const [createUser, setCreateUser] = useState<User | null>(null)
  const [createForm, setCreateForm] = useState({ full_name: '', user_type: 'customer' })
  const [isCreating, setIsCreating] = useState(false)

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (column: typeof sortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 opacity-30" />
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const filteredUsers = users
    .filter(user => {
      const matchesSearch =
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter =
        filterType === 'all' || user.user_type === filterType

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortColumn) {
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '')
          break
        case 'full_name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '')
          break
        case 'user_type':
          comparison = a.user_type.localeCompare(b.user_type)
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'last_sign_in_at':
          const aTime = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
          const bTime = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
          comparison = aTime - bTime
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

  const handleDelete = async () => {
    if (!deleteUser) return

    console.log('Client: Starting delete for', deleteUser.id, deleteUser.email)
    setIsDeleting(true)
    try {
      const result = await deleteUserCompletely(deleteUser.id, deleteUser.email || '')

      console.log('Client: Delete result', result)

      if (result.error) {
        console.error('Client: Delete failed', result.error)
        alert(`삭제 실패: ${result.error}`)
      } else {
        console.log('Client: Delete success, refreshing data from server')
        alert('사용자가 완전히 삭제되었습니다.')
        // Force refresh from server to get latest data
        router.refresh()
      }
    } catch (error) {
      console.error('Client: Delete error:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
      setDeleteUser(null)
    }
  }

  const handleEdit = (user: User) => {
    setEditUser(user)
    setEditForm({
      full_name: user.full_name || '',
      user_type: user.user_type,
    })
  }

  const handleUpdate = async () => {
    if (!editUser) return

    setIsUpdating(true)
    try {
      const result = await updateUser(editUser.id, editForm)

      if (result.error) {
        alert(`수정 실패: ${result.error}`)
      } else {
        alert('사용자 정보가 수정되었습니다.')
        setEditUser(null)
        // Force refresh from server to get latest data
        router.refresh()
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreate = (user: User) => {
    setCreateUser(user)
    setCreateForm({
      full_name: '',
      user_type: 'customer',
    })
  }

  const handleCreateProfile = async () => {
    if (!createUser) return

    setIsCreating(true)
    try {
      const result = await createProfile(createUser.id, createUser.email || '', createForm)

      if (result.error) {
        alert(`프로필 생성 실패: ${result.error}`)
      } else {
        alert('프로필이 생성되었습니다.')
        setCreateUser(null)
        // Force refresh from server to get latest data
        router.refresh()
      }
    } catch (error) {
      console.error('Create profile error:', error)
      alert('프로필 생성 중 오류가 발생했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이메일 또는 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
          >
            전체 ({users.length})
          </Button>
          <Button
            variant={filterType === 'customer' ? 'default' : 'outline'}
            onClick={() => setFilterType('customer')}
          >
            고객 ({users.filter(u => u.user_type === 'customer').length})
          </Button>
          <Button
            variant={filterType === 'trainer' ? 'default' : 'outline'}
            onClick={() => setFilterType('trainer')}
          >
            트레이너 ({users.filter(u => u.user_type === 'trainer').length})
          </Button>
          <Button
            variant={filterType === 'admin' ? 'default' : 'outline'}
            onClick={() => setFilterType('admin')}
          >
            관리자 ({users.filter(u => u.user_type === 'admin').length})
          </Button>
        </div>
      </div>

      {/* User List */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th
                className="text-left p-4 cursor-pointer select-none hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center gap-1">
                  <span>이메일</span>
                  {getSortIcon('email')}
                </div>
              </th>
              <th
                className="text-left p-4 cursor-pointer select-none hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('full_name')}
              >
                <div className="flex items-center gap-1">
                  <span>이름</span>
                  {getSortIcon('full_name')}
                </div>
              </th>
              <th
                className="text-left p-4 cursor-pointer select-none hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('user_type')}
              >
                <div className="flex items-center gap-1">
                  <span>유형</span>
                  {getSortIcon('user_type')}
                </div>
              </th>
              <th
                className="text-left p-4 cursor-pointer select-none hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  <span>가입일</span>
                  {getSortIcon('created_at')}
                </div>
              </th>
              <th
                className="text-left p-4 cursor-pointer select-none hover:bg-muted/70 transition-colors"
                onClick={() => handleSort('last_sign_in_at')}
              >
                <div className="flex items-center gap-1">
                  <span>마지막 로그인</span>
                  {getSortIcon('last_sign_in_at')}
                </div>
              </th>
              <th className="text-right p-4">작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-t hover:bg-muted/50">
                <td className="p-4">
                  {user.email || '-'}
                  {!user.has_profile && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      프로필 없음
                    </Badge>
                  )}
                </td>
                <td className="p-4">{user.full_name || '-'}</td>
                <td className="p-4">
                  <Badge variant={
                    user.user_type === 'admin' ? 'destructive' :
                    user.user_type === 'trainer' ? 'default' :
                    user.user_type === 'unknown' ? 'outline' :
                    'secondary'
                  }>
                    {user.user_type === 'unknown' ? '미설정' : user.user_type}
                  </Badge>
                </td>
                <td className="p-4">
                  {new Date(user.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td className="p-4">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '로그인 기록 없음'}
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    {!user.has_profile ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCreate(user)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        프로필 생성
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        편집
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteUser(user)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* Create Profile Dialog */}
      <Dialog open={!!createUser} onOpenChange={() => setCreateUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로필 생성</DialogTitle>
            <DialogDescription>
              {createUser?.email} - 새 프로필을 만듭니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create_full_name">이름</Label>
              <Input
                id="create_full_name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="이름 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_user_type">사용자 유형</Label>
              <Select
                value={createForm.user_type}
                onValueChange={(value) => setCreateForm({ ...createForm, user_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">고객</SelectItem>
                  <SelectItem value="trainer">트레이너</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUser(null)} disabled={isCreating}>
              취소
            </Button>
            <Button onClick={handleCreateProfile} disabled={isCreating}>
              {isCreating ? '생성 중...' : '프로필 생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 편집</DialogTitle>
            <DialogDescription>
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">이름</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="이름 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_type">사용자 유형</Label>
              <Select
                value={editForm.user_type}
                onValueChange={(value) => setEditForm({ ...editForm, user_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">고객</SelectItem>
                  <SelectItem value="trainer">트레이너</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={isUpdating}>
              취소
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              사용자 완전 삭제
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="font-semibold">
                  {deleteUser?.email || deleteUser?.full_name}
                </p>
                <p>
                  이 작업은 되돌릴 수 없습니다. 다음 데이터가 모두 삭제됩니다:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>프로필 정보</li>
                  <li>고객/트레이너 레코드</li>
                  <li>예약 내역</li>
                  <li>리뷰</li>
                  <li>알림</li>
                  <li>주소</li>
                  <li>Auth 계정</li>
                </ul>
                <p className="text-destructive font-semibold mt-4">
                  정말로 삭제하시겠습니까?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '완전히 삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
