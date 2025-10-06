'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

interface BookingCalendarProps {
  onDateTimeSelect: (date: Date | undefined, time: string | null) => void
  bookedDates?: Date[]
  availableTimeSlots?: string[]
  minDate?: Date
  maxDate?: Date
}

export function BookingCalendar({
  onDateTimeSelect,
  bookedDates = [],
  availableTimeSlots,
  minDate = new Date(),
  maxDate
}: BookingCalendarProps) {
  const [date, setDate] = React.useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null)

  // 기본 시간 슬롯 (30분 단위, 9:00 ~ 18:00)
  const defaultTimeSlots = Array.from({ length: 19 }, (_, i) => {
    const totalMinutes = i * 30
    const hour = Math.floor(totalMinutes / 60) + 9
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  const timeSlots = availableTimeSlots || defaultTimeSlots

  // 날짜나 시간이 변경될 때마다 부모에게 알림
  React.useEffect(() => {
    onDateTimeSelect(date, selectedTime)
  }, [date, selectedTime, onDateTimeSelect])

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    // 날짜가 변경되면 시간 선택 초기화
    setSelectedTime(null)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  return (
    <Card className="gap-0 p-0">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Calendar Section */}
          <div className="w-full flex justify-center items-center px-4 py-6 lg:px-6 border-b lg:border-b-0 lg:border-r">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              defaultMonth={date || minDate}
              disabled={(date) => {
                // 과거 날짜 비활성화
                if (date < minDate) return true
                // 최대 날짜 이후 비활성화
                if (maxDate && date > maxDate) return true
                // 예약된 날짜 비활성화
                return bookedDates.some(
                  (bookedDate) =>
                    bookedDate.getDate() === date.getDate() &&
                    bookedDate.getMonth() === date.getMonth() &&
                    bookedDate.getFullYear() === date.getFullYear()
                )
              }}
              showOutsideDays={false}
              modifiers={{
                booked: bookedDates
              }}
              modifiersClassNames={{
                booked: '[&>button]:line-through opacity-100'
              }}
              className="bg-transparent p-0 mx-auto [--cell-size:2.5rem] md:[--cell-size:2.75rem]"
            />
          </div>

          {/* Time Slots Section */}
          <div className="w-full lg:w-80 p-6">
            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant={selectedTime === time ? 'default' : 'outline'}
                  onClick={() => handleTimeSelect(time)}
                  className="w-full shadow-none"
                  disabled={!date}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t !py-5 px-6 md:flex-row">
        <div className="text-sm">
          {date && selectedTime ? (
            <>
              선택하신 예약 시간은{' '}
              <span className="font-medium">
                {date?.toLocaleDateString('ko-KR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>{' '}
              <span className="font-medium">{selectedTime}</span> 입니다.
            </>
          ) : (
            <>예약을 원하시는 날짜와 시간을 선택해주세요.</>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
