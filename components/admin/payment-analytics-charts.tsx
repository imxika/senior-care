 
'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Payment {
  id: string;
  amount: string;
  payment_status: string;
  payment_provider?: string;
  paid_at?: string;
  created_at: string;
  booking?: {
    service_type?: string;
  } | Array<{
    service_type?: string;
  }>;
}

interface PaymentAnalyticsChartsProps {
  payments: Payment[]
}

const COLORS = {
  toss: '#0064FF',
  stripe: '#635BFF',
  paid: '#10B981',
  pending: '#F59E0B',
  failed: '#EF4444',
  refunded: '#6B7280',
  home_visit: '#8B5CF6',
  center_visit: '#EC4899',
  online: '#06B6D4',
}

export function PaymentAnalyticsCharts({ payments }: PaymentAnalyticsChartsProps) {
  // 1. 월별 매출 트렌드
  const monthlyRevenue = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; count: number }>()

    payments
      .filter(p => p.payment_status === 'paid' && p.paid_at)
      .forEach(payment => {
        const date = payment.paid_at ? new Date(payment.paid_at) : new Date()
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!monthMap.has(key)) {
          monthMap.set(key, { revenue: 0, count: 0 })
        }

        const data = monthMap.get(key)!
        data.revenue += parseFloat(payment.amount)
        data.count += 1
      })

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6) // 최근 6개월
      .map(([month, data]) => ({
        month: month.substring(5) + '월',
        revenue: Math.round(data.revenue),
        count: data.count,
      }))
  }, [payments])

  // 2. 결제 수단별 분포
  const providerDistribution = useMemo(() => {
    const distribution = payments
      .filter(p => p.payment_status === 'paid')
      .reduce((acc, payment) => {
        const provider = payment.payment_provider || 'unknown'
        if (!acc[provider]) {
          acc[provider] = { count: 0, revenue: 0 }
        }
        acc[provider].count += 1
        acc[provider].revenue += parseFloat(payment.amount)
        return acc
      }, {} as Record<string, { count: number; revenue: number }>)

    return Object.entries(distribution).map(([name, data]) => ({
      name: name === 'toss' ? 'Toss Payments' : name === 'stripe' ? 'Stripe' : name,
      count: data.count,
      revenue: Math.round(data.revenue),
    }))
  }, [payments])

  // 3. 결제 상태별 분포
  const statusDistribution = useMemo(() => {
    const distribution = payments.reduce((acc, payment) => {
      const status = payment.payment_status || 'unknown'
      if (!acc[status]) {
        acc[status] = 0
      }
      acc[status] += 1
      return acc
    }, {} as Record<string, number>)

    const statusLabels: Record<string, string> = {
      paid: '결제 완료',
      pending: '결제 대기',
      failed: '결제 실패',
      cancelled: '취소',
      refunded: '환불',
    }

    return Object.entries(distribution).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      status,
    }))
  }, [payments])

  // 4. 서비스 타입별 매출
  const serviceTypeRevenue = useMemo(() => {
    const distribution = payments
      .filter(p => p.payment_status === 'paid' && p.booking)
      .reduce((acc, payment) => {
        const booking = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking
        const serviceType = booking?.service_type || 'unknown'
        if (!acc[serviceType]) {
          acc[serviceType] = { count: 0, revenue: 0 }
        }
        acc[serviceType].count += 1
        acc[serviceType].revenue += parseFloat(payment.amount)
        return acc
      }, {} as Record<string, { count: number; revenue: number }>)

    const typeLabels: Record<string, string> = {
      home_visit: '방문형',
      center_visit: '센터형',
      online: '온라인',
    }

    return Object.entries(distribution).map(([type, data]) => ({
      name: typeLabels[type] || type,
      type,
      count: data.count,
      revenue: Math.round(data.revenue),
    }))
  }, [payments])

  // 5. 일별 결제 건수 (최근 30일)
  const dailyPayments = useMemo(() => {
    const dayMap = new Map<string, number>()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    payments
      .filter(p => p.payment_status === 'paid' && p.paid_at)
      .forEach(payment => {
        const date = payment.paid_at ? new Date(payment.paid_at) : new Date()
        if (date >= thirtyDaysAgo) {
          const key = date.toISOString().split('T')[0]
          dayMap.set(key, (dayMap.get(key) || 0) + 1)
        }
      })

    return Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14) // 최근 14일
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        count,
      }))
  }, [payments])

  // 통계 계산
  const stats = useMemo(() => {
    const paidPayments = payments.filter(p => p.payment_status === 'paid')
    const totalRevenue = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)
    const averageAmount = paidPayments.length > 0 ? totalRevenue / paidPayments.length : 0

    return {
      totalPayments: payments.length,
      paidPayments: paidPayments.length,
      totalRevenue: Math.round(totalRevenue),
      averageAmount: Math.round(averageAmount),
    }
  }, [payments])

  return (
    <div className="space-y-6">
      {/* 요약 통계 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>총 결제 건수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPayments}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>완료된 결제</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.paidPayments}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>총 매출</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.totalRevenue.toLocaleString()}원
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>평균 결제 금액</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats.averageAmount.toLocaleString()}원
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 그리드 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 월별 매출 트렌드 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 매출 트렌드</CardTitle>
            <CardDescription>최근 6개월 매출 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString() + '원'}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="매출" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 일별 결제 건수 */}
        <Card>
          <CardHeader>
            <CardTitle>일별 결제 건수</CardTitle>
            <CardDescription>최근 14일 결제 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyPayments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip labelStyle={{ color: '#000' }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="결제 건수"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 결제 수단별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>결제 수단별 분포</CardTitle>
            <CardDescription>Toss vs Stripe 비교</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={providerDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {providerDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name.includes('Toss') ? COLORS.toss : COLORS.stripe}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {providerDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: item.name.includes('Toss') ? COLORS.toss : COLORS.stripe,
                      }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">{item.count}건</span>
                    <span className="font-medium">{item.revenue.toLocaleString()}원</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 결제 상태별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>결제 상태별 분포</CardTitle>
            <CardDescription>전체 결제 상태 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[entry.status as keyof typeof COLORS] || '#9CA3AF'
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {statusDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: COLORS[item.status as keyof typeof COLORS] || '#9CA3AF',
                      }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <Badge variant="outline">{item.value}건</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 서비스 타입별 매출 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>서비스 타입별 매출</CardTitle>
            <CardDescription>방문형 vs 센터형 vs 온라인 비교</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceTypeRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString() + '원'}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="매출" fill="#8B5CF6" />
                <Bar dataKey="count" name="건수" fill="#EC4899" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {serviceTypeRevenue.map((item, index) => (
                <div key={index} className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">{item.name}</div>
                  <div className="text-2xl font-bold mt-1">
                    {item.revenue.toLocaleString()}원
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{item.count}건</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
