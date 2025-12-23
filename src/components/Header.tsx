'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: '홈', href: '/' },
  { name: '광고 성과 계산', href: '/tools/ad-performance' },
  { name: '키워드 분석', href: '/tools/keyword-analysis' },
  { name: 'ROI 계산기', href: '/tools/roi-calculator' },
  { name: '손익분기점 계산기', href: '/tools/break-even-point' },
  { name: '광고 예산 계산기', href: '/tools/budget-calculator' },
  { name: 'CRO 계산기', href: '/tools/conversion-calculator' },
  { name: '수익성 진단', href: '/tools/profitability-diagnosis' },
  { name: '문의하기', href: '/contact' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-foreground">
              마케팅 도구 모음
            </Link>
          </div>
          <nav className="flex space-x-1 overflow-x-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

