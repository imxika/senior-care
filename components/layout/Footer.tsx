'use client'

import Link from "next/link"
import { Mail, Phone, MapPin } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 브랜드 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
                시
              </div>
              <span className="text-xl font-bold">시니어 재활</span>
            </div>
            <p className="text-sm text-gray-600">
              전문 트레이너와 함께하는<br />
              시니어 맞춤 재활 서비스
            </p>
          </div>

          {/* 서비스 */}
          <div>
            <h3 className="font-semibold mb-4">서비스</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/trainers" className="text-gray-600 hover:text-primary transition-colors">
                  트레이너 찾기
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-gray-600 hover:text-primary transition-colors">
                  가격안내
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-primary transition-colors">
                  서비스 소개
                </Link>
              </li>
              <li>
                <Link href="/customer/dashboard" className="text-gray-600 hover:text-primary transition-colors">
                  고객 대시보드
                </Link>
              </li>
              <li>
                <Link href="/trainer/dashboard" className="text-gray-600 hover:text-primary transition-colors">
                  트레이너 대시보드
                </Link>
              </li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h3 className="font-semibold mb-4">고객지원</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-primary transition-colors">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-primary transition-colors">
                  문의하기
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-primary transition-colors">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-primary transition-colors">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>

          {/* 연락처 */}
          <div>
            <h3 className="font-semibold mb-4">연락처</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>1588-0000</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>support@seniorcare.kr</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>서울시 강남구<br />테헤란로 123</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 저작권 */}
        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
          <p>© 2025 시니어 재활. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
