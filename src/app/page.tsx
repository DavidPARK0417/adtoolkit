import type { Metadata } from 'next';
import Link from 'next/link';
import Card from '@/components/ui/Card';

export const metadata: Metadata = {
  title: '홈',
  description: 'ROI 계산기, 광고 예산 계산기, 키워드 분석, 손익분기점 계산 등 다양한 마케팅 도구를 무료로 제공합니다. 광고 성과를 최적화하고 비즈니스 성장을 가속화하세요.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '마케팅 도구 모음 - 광고 성과 계산 및 분석 도구',
    description: 'ROI 계산기, 광고 예산 계산기, 키워드 분석 등 다양한 마케팅 도구를 무료로 제공합니다.',
    url: '/',
    images: ['/adtoolkit_logo.jpg'],
  },
};

const tools = [
  {
    name: '광고 성과 계산',
    description: '여러 상품의 광고 성과를 비교하고 최적의 상품을 찾아보세요',
    href: '/tools/ad-performance',
    icon: '📊',
  },
  {
    name: '키워드 분석',
    description: '키워드의 검색량, 경쟁도, CPC를 분석하여 최적의 키워드를 찾아보세요',
    href: '/tools/keyword-analysis',
    icon: '🔍',
  },
  {
    name: 'ROI 계산기',
    description: '투자 대비 수익률을 계산하여 광고 효과를 측정하세요',
    href: '/tools/roi-calculator',
    icon: '💰',
  },
  {
    name: '손익분기점 계산기',
    description: '고정비와 변동비를 기반으로 손익분기점을 계산하여 최소 판매 목표를 설정하세요',
    href: '/tools/break-even-point',
    icon: '📊',
  },
  {
    name: '광고 예산 계산기',
    description: '목표 전환수와 CPC를 기반으로 필요한 광고 예산을 계산하세요',
    href: '/tools/budget-calculator',
    icon: '💵',
  },
  {
    name: 'CRO 전환율 최적화 계산기',
    description: '전환율 개선에 따른 월간/연간 예상 매출 증가액과 추가 확보 전환수를 계산하세요',
    href: '/tools/conversion-calculator',
    icon: '📈',
  },
  {
    name: '마케팅 수익성 진단',
    description: '목표 CPA, LTV, LTV:CAC 비율을 3단계로 진단하여 광고 예산을 최적화하세요',
    href: '/tools/profitability-diagnosis',
    icon: '📊',
  },
];

export default function Home() {
  // 구조화된 데이터 (JSON-LD) - 검색 엔진 최적화
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '마케팅 도구 모음',
    description: 'ROI 계산기, 광고 예산 계산기, 키워드 분석 등 다양한 마케팅 도구를 무료로 제공합니다.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1',
    },
  };

  return (
    <>
      {/* 구조화된 데이터 추가 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Hero 섹션 */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="
            text-2xl sm:text-3xl lg:text-4xl xl:text-5xl
            font-bold mb-4
            text-gray-900 dark:text-white dark:font-extrabold
            leading-tight
          ">
            마케팅 도구 모음
          </h1>
          <p className="
            text-base sm:text-lg lg:text-xl
            text-gray-600 dark:text-gray-200
            max-w-2xl mx-auto
          ">
            다양한 마케팅 도구를 활용하여 광고 성과를 최적화하세요
          </p>
        </div>

        {/* 도구 그리드 */}
        <div className="
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          lg:grid-cols-3 
          xl:grid-cols-4
          gap-4 sm:gap-6 lg:gap-8
        ">
          {tools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.href}
              className="block"
            >
              <Card hoverable padding="md" className="h-full">
                <div className="flex flex-col h-full">
                  <div className="text-4xl sm:text-5xl mb-4">{tool.icon}</div>
                  <h2 className="
                    text-lg sm:text-xl lg:text-2xl
                    font-semibold mb-2
                    text-gray-900 dark:text-white
                  ">
                    {tool.name}
                  </h2>
                  <p className="
                    text-sm sm:text-base
                    text-gray-600 dark:text-gray-200
                    flex-grow
                  ">
                    {tool.description}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
