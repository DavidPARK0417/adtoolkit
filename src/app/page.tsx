import Link from 'next/link';

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
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            마케팅 도구 모음
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            다양한 마케팅 도구를 활용하여 광고 성과를 최적화하세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.href}
              className="block bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-800"
            >
              <div className="text-4xl mb-4">{tool.icon}</div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                {tool.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
