'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

interface MonthlyData {
  month: string
  revenue: number
}

interface BookingData {
  month: string
  total: number
  completed: number
}

interface AdminStatsChartsProps {
  monthlyData: MonthlyData[]
  bookingData: BookingData[]
}

export function AdminStatsCharts({ monthlyData, bookingData }: AdminStatsChartsProps) {
  return (
    <>
      {/* 월별 매출 추이 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 매출 추이 (최근 6개월)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: {
                label: "매출",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 월별 예약 추이 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 예약 추이 (최근 6개월)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              total: {
                label: "전체 예약",
                color: "hsl(var(--chart-2))",
              },
              completed: {
                label: "완료된 예약",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <BarChart data={bookingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  )
}
