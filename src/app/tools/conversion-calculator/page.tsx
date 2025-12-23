'use client';

import { useState, useEffect } from 'react';
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
} from 'recharts';

export default function ConversionCalculatorPage() {
  const [productName, setProductName] = useState<string>('');
  const [monthlyVisitors, setMonthlyVisitors] = useState<number>(0);
  const [currentConversionRate, setCurrentConversionRate] = useState<number>(0);
  const [improvedConversionRate, setImprovedConversionRate] = useState<number>(0);
  const [averageOrderValue, setAverageOrderValue] = useState<number>(0);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState<boolean>(false);

  // 계산 결과
  const [currentMonthlyConversions, setCurrentMonthlyConversions] = useState<number>(0);
  const [improvedMonthlyConversions, setImprovedMonthlyConversions] = useState<number>(0);
  const [additionalConversions, setAdditionalConversions] = useState<number>(0);
  const [monthlyRevenueIncrease, setMonthlyRevenueIncrease] = useState<number>(0);
  const [yearlyRevenueIncrease, setYearlyRevenueIncrease] = useState<number>(0);
  const [conversionRateImprovement, setConversionRateImprovement] = useState<number>(0);

  // AI 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');

  // AI로 전환율 정보 추정
  const handleAIEstimate = async () => {
    if (!productName.trim()) {
      alert('상품명을 먼저 입력해주세요.');
      return;
    }

    console.log('=== AI 전환율 정보 추정 시작 ===', productName);
    setIsLoadingEstimate(true);

    try {
      const response = await fetch('/api/estimate-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: productName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '전환율 정보 추정에 실패했습니다.');
        return;
      }

      if (result.success && result.data) {
        console.log('AI 추정 결과:', result.data);
        // 기존 값이 0이 아닌 경우 유지, 0인 경우만 AI 결과로 채우기
        if (monthlyVisitors === 0) {
          setMonthlyVisitors(result.data.monthlyVisitors);
        }
        if (currentConversionRate === 0) {
          setCurrentConversionRate(result.data.currentConversionRate);
        }
        if (improvedConversionRate === 0) {
          setImprovedConversionRate(result.data.improvedConversionRate);
        }
        if (averageOrderValue === 0) {
          setAverageOrderValue(result.data.averageOrderValue);
        }
      } else {
        console.error('응답 형식 오류:', result);
        alert('전환율 정보 추정에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 추정 오류:', error);
      alert('전환율 정보 추정 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingEstimate(false);
    }
  };

  // AI 분석 요청
  const handleAIAnalysis = async () => {
    if (!hasValidInputs) return;

    setIsAnalyzing(true);
    setAiError('');
    setAiAnalysis('');

    console.log('=== AI 분석 요청 ===');
    console.log('요청 데이터:', {
      monthlyVisitors,
      currentConversionRate,
      improvedConversionRate,
      averageOrderValue,
      additionalConversions,
      monthlyRevenueIncrease,
      yearlyRevenueIncrease,
      conversionRateImprovement,
    });

    try {
      const response = await fetch('/api/analyze-cro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monthlyVisitors,
          currentConversionRate,
          improvedConversionRate,
          averageOrderValue,
          additionalConversions,
          monthlyRevenueIncrease,
          yearlyRevenueIncrease,
          conversionRateImprovement,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI 분석 중 오류가 발생했습니다.');
      }

      console.log('AI 분석 완료:', data.analysis);
      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error('AI 분석 오류:', error);
      setAiError(error instanceof Error ? error.message : 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 마크다운 렌더링 함수
  const renderMarkdown = (text: string) => {
    const html = text;
    
    // 줄 단위로 분리
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let inTable = false;
    let tableRows: string[][] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 표 처리 (마크다운 표 형식: | 컬럼1 | 컬럼2 |)
      if (line.includes('|') && line.split('|').length >= 3) {
        // 헤더 구분선 체크 (|---|---|)
        if (/^[\|\s\-:]+$/.test(line)) {
          continue; // 헤더 구분선은 건너뛰기
        }
        
        if (!inTable) {
          // 표 시작
          inTable = true;
          tableRows = [];
        }
        
        // 표 행 파싱
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        // 표 종료
        if (tableRows.length > 0) {
          processedLines.push('<div class="overflow-x-auto my-4">');
          processedLines.push('<table class="w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">');
          
          // 첫 번째 행을 헤더로 사용
          if (tableRows.length > 0) {
            processedLines.push('<thead>');
            processedLines.push('<tr class="bg-gray-100 dark:bg-gray-700">');
            tableRows[0].forEach(cell => {
              processedLines.push(`<th class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">${cell}</th>`);
            });
            processedLines.push('</tr>');
            processedLines.push('</thead>');
            processedLines.push('<tbody>');
            
            // 나머지 행들을 데이터로 사용
            for (let j = 1; j < tableRows.length; j++) {
              processedLines.push('<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">');
              tableRows[j].forEach(cell => {
                processedLines.push(`<td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300">${cell}</td>`);
              });
              processedLines.push('</tr>');
            }
            processedLines.push('</tbody>');
          }
          
          processedLines.push('</table>');
          processedLines.push('</div>');
        }
        inTable = false;
        tableRows = [];
      }
      
      // 헤더 처리 (숫자로 시작하는 제목 감지)
      if (/^\d+\.\s+/.test(line)) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        const titleText = line.replace(/^\d+\.\s+/, '');
        processedLines.push(`<h2 class="text-2xl font-bold mt-6 mb-4 text-purple-700 dark:text-purple-300">${titleText}</h2>`);
        continue;
      }
      
      if (line.startsWith('### ')) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(`<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">${line.substring(4)}</h3>`);
        continue;
      }
      if (line.startsWith('## ')) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(`<h2 class="text-xl font-semibold mt-5 mb-3 text-foreground">${line.substring(3)}</h2>`);
        continue;
      }
      if (line.startsWith('# ')) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(`<h1 class="text-2xl font-bold mt-6 mb-4 text-foreground">${line.substring(2)}</h1>`);
        continue;
      }
      
      // 리스트 처리
      if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\. /.test(line)) {
        if (!inList) {
          processedLines.push('<ul class="list-disc ml-6 mb-3 space-y-1">');
          inList = true;
        }
        const content = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        // ** 제거하고 색상 적용
        const processedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-600 dark:text-blue-400">$1</strong>');
        processedLines.push(`<li class="text-gray-700 dark:text-gray-300">${processedContent}</li>`);
        continue;
      }
      
      // 리스트 종료
      if (inList && line === '') {
        processedLines.push('</ul>');
        inList = false;
        continue;
      }
      
      // 일반 텍스트
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      
      if (line) {
        // ** 제거하고 색상이 있는 strong 태그로 변환
        const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-600 dark:text-blue-400">$1</strong>');
        processedLines.push(`<p class="mb-3 text-gray-700 dark:text-gray-300">${processedLine}</p>`);
      } else {
        processedLines.push('<br />');
      }
    }
    
    // 표가 끝나지 않은 경우 닫기
    if (inTable && tableRows.length > 0) {
      processedLines.push('<div class="overflow-x-auto my-4">');
      processedLines.push('<table class="w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm">');
      
      if (tableRows.length > 0) {
        processedLines.push('<thead>');
        processedLines.push('<tr class="bg-gray-100 dark:bg-gray-700">');
        tableRows[0].forEach(cell => {
          processedLines.push(`<th class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-200">${cell}</th>`);
        });
        processedLines.push('</tr>');
        processedLines.push('</thead>');
        processedLines.push('<tbody>');
        
        for (let j = 1; j < tableRows.length; j++) {
          processedLines.push('<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">');
          tableRows[j].forEach(cell => {
            processedLines.push(`<td class="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300">${cell}</td>`);
          });
          processedLines.push('</tr>');
        }
        processedLines.push('</tbody>');
      }
      
      processedLines.push('</table>');
      processedLines.push('</div>');
    }
    
    // 리스트가 끝나지 않은 경우 닫기
    if (inList) {
      processedLines.push('</ul>');
    }
    
    return processedLines.join('\n');
  };

  // 실시간 계산
  useEffect(() => {
    console.log('=== CRO 계산 시작 ===');
    console.log('월간 방문자 수:', monthlyVisitors);
    console.log('현재 전환율:', currentConversionRate, '%');
    console.log('개선된 전환율:', improvedConversionRate, '%');
    console.log('평균 주문 금액:', averageOrderValue, '원');

    // 현재 월간 전환수
    const currentConversions = monthlyVisitors > 0 && currentConversionRate > 0
      ? monthlyVisitors * (currentConversionRate / 100)
      : 0;

    // 개선된 월간 전환수
    const improvedConversions = monthlyVisitors > 0 && improvedConversionRate > 0
      ? monthlyVisitors * (improvedConversionRate / 100)
      : 0;

    // 추가 확보 전환수
    const additional = improvedConversions - currentConversions;

    // 월간 예상 매출 증가액
    const monthlyIncrease = additional * averageOrderValue;

    // 연간 예상 매출 증가액
    const yearlyIncrease = monthlyIncrease * 12;

    // 전환율 개선률
    const improvement = currentConversionRate > 0
      ? ((improvedConversionRate - currentConversionRate) / currentConversionRate) * 100
      : 0;

    setCurrentMonthlyConversions(currentConversions);
    setImprovedMonthlyConversions(improvedConversions);
    setAdditionalConversions(additional);
    setMonthlyRevenueIncrease(monthlyIncrease);
    setYearlyRevenueIncrease(yearlyIncrease);
    setConversionRateImprovement(improvement);

    // 계산 결과 로깅
    if (monthlyVisitors > 0 && currentConversionRate > 0 && improvedConversionRate > 0 && averageOrderValue > 0) {
      console.log('=== 계산 결과 ===');
      console.log('현재 월간 전환수:', currentConversions.toFixed(2));
      console.log('개선된 월간 전환수:', improvedConversions.toFixed(2));
      console.log('추가 확보 전환수:', additional.toFixed(2));
      console.log('월간 예상 매출 증가액:', monthlyIncrease.toLocaleString('ko-KR'), '원');
      console.log('연간 예상 매출 증가액:', yearlyIncrease.toLocaleString('ko-KR'), '원');
      console.log('전환율 개선률:', improvement.toFixed(2), '%');
    }
  }, [monthlyVisitors, currentConversionRate, improvedConversionRate, averageOrderValue]);

  const hasValidInputs = monthlyVisitors > 0 && currentConversionRate > 0 && 
                         improvedConversionRate > 0 && averageOrderValue > 0;

  // 차트 데이터 준비
  const conversionRateData = [
    { name: '현재 전환율', value: currentConversionRate, fill: '#ef4444' },
    { name: '개선된 전환율', value: improvedConversionRate, fill: '#10b981' },
  ];

  const conversionCountData = [
    { name: '현재 전환수', value: currentMonthlyConversions, fill: '#3b82f6' },
    { name: '개선된 전환수', value: improvedMonthlyConversions, fill: '#10b981' },
  ];

  const revenueComparisonData = [
    { name: '월간', 현재: currentMonthlyConversions * averageOrderValue, 개선: improvedMonthlyConversions * averageOrderValue },
    { name: '연간', 현재: currentMonthlyConversions * averageOrderValue * 12, 개선: improvedMonthlyConversions * averageOrderValue * 12 },
  ];

  // 월별 매출 예측 데이터 (12개월)
  const monthlyRevenueData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const currentMonthlyRevenue = currentMonthlyConversions * averageOrderValue;
    const improvedMonthlyRevenue = improvedMonthlyConversions * averageOrderValue;
    return {
      month: `${month}월`,
      현재: currentMonthlyRevenue,
      개선: improvedMonthlyRevenue,
    };
  });

  // 데이터 요약 표 데이터
  const summaryTableData = [
    { 항목: '월간 방문자 수', 현재: monthlyVisitors.toLocaleString('ko-KR') + '명', 개선: monthlyVisitors.toLocaleString('ko-KR') + '명', 차이: '-' },
    { 항목: '전환율', 현재: currentConversionRate + '%', 개선: improvedConversionRate + '%', 차이: (improvedConversionRate - currentConversionRate).toFixed(2) + '%p' },
    { 항목: '월간 전환수', 현재: currentMonthlyConversions.toFixed(0) + '건', 개선: improvedMonthlyConversions.toFixed(0) + '건', 차이: '+' + additionalConversions.toFixed(0) + '건' },
    { 항목: '월간 매출', 현재: (currentMonthlyConversions * averageOrderValue).toLocaleString('ko-KR') + '원', 개선: (improvedMonthlyConversions * averageOrderValue).toLocaleString('ko-KR') + '원', 차이: '+' + monthlyRevenueIncrease.toLocaleString('ko-KR') + '원' },
    { 항목: '연간 매출', 현재: (currentMonthlyConversions * averageOrderValue * 12).toLocaleString('ko-KR') + '원', 개선: (improvedMonthlyConversions * averageOrderValue * 12).toLocaleString('ko-KR') + '원', 차이: '+' + yearlyRevenueIncrease.toLocaleString('ko-KR') + '원' },
  ];


  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          CRO 전환율 최적화 계산기
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          전환율 개선에 따른 월간/연간 예상 매출 증가액과 추가 확보 전환수를 실시간으로 계산하세요
        </p>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                상품명 또는 비즈니스 정보
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => {
                    console.log('상품명 변경:', e.target.value);
                    setProductName(e.target.value);
                  }}
                  placeholder="예: 스마트폰 케이스, 온라인 강의 등"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                />
                <button
                  onClick={handleAIEstimate}
                  disabled={isLoadingEstimate || !productName.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                  title="AI로 전환율 정보 자동 입력"
                >
                  {isLoadingEstimate ? 'AI 분석 중...' : '🤖 AI 추정'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                월간 방문자 수
              </label>
              <input
                type="number"
                value={monthlyVisitors || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  console.log('월간 방문자 수 변경:', value);
                  setMonthlyVisitors(value);
                }}
                placeholder="예: 10000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                현재 전환율 (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={currentConversionRate || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  console.log('현재 전환율 변경:', value, '%');
                  setCurrentConversionRate(value);
                }}
                placeholder="예: 2.5"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                개선된 전환율 (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={improvedConversionRate || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  console.log('개선된 전환율 변경:', value, '%');
                  setImprovedConversionRate(value);
                }}
                placeholder="예: 3.5"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                평균 주문 금액 (원)
              </label>
              <input
                type="number"
                value={averageOrderValue || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  console.log('평균 주문 금액 변경:', value, '원');
                  setAverageOrderValue(value);
                }}
                placeholder="예: 50000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
              />
            </div>
          </div>

          {hasValidInputs && (
            <div className="mt-8 space-y-6">
              {/* 데이터 요약 표 */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  📊 데이터 요약 비교표
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">항목</th>
                        <th className="text-right py-3 px-4 font-semibold text-red-600 dark:text-red-400">현재</th>
                        <th className="text-right py-3 px-4 font-semibold text-green-600 dark:text-green-400">개선</th>
                        <th className="text-right py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">차이</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryTableData.map((row, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-3 px-4 text-foreground">{row.항목}</td>
                          <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.현재}</td>
                          <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.개선}</td>
                          <td className="py-3 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">{row.차이}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 차트 섹션 */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-6">
                  📈 시각화 차트
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* 전환율 비교 막대 차트 */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">전환율 비교</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={conversionRateData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} />
                        <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" />
                        <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                          formatter={(value: number) => `${value.toFixed(2)}%`}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {conversionRateData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 전환수 비교 파이 차트 */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">전환수 비교</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={conversionCountData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {conversionCountData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                          formatter={(value: number) => `${value.toFixed(0)}건`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 매출 비교 막대 차트 */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-6">
                  <h4 className="text-sm font-semibold mb-3 text-foreground">매출 비교 (월간/연간)</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" />
                      <YAxis 
                        tick={{ fill: 'currentColor', fontSize: 12 }} 
                        stroke="currentColor"
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                        formatter={(value: number) => `${value.toLocaleString('ko-KR')}원`}
                      />
                      <Bar dataKey="현재" fill="#ef4444" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="개선" fill="#10b981" radius={[8, 8, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 월별 매출 예측 라인 차트 */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3 text-foreground">월별 매출 예측 (12개월)</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'currentColor', fontSize: 11 }} 
                        stroke="currentColor"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fill: 'currentColor', fontSize: 12 }} 
                        stroke="currentColor"
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                        formatter={(value: number) => `${value.toLocaleString('ko-KR')}원`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="현재" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="개선" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 계산 결과 카드 */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
                  계산 결과
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        추가 확보 전환수 (월간)
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {additionalConversions.toFixed(0)}건
                      </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        전환율 개선률
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {conversionRateImprovement > 0 ? '+' : ''}{conversionRateImprovement.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-blue-200 dark:border-blue-700">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          월간 예상 매출 증가액
                        </span>
                        <span className="text-xl font-bold text-foreground">
                          {monthlyRevenueIncrease.toLocaleString('ko-KR')} 원
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          연간 예상 매출 증가액
                        </span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {yearlyRevenueIncrease.toLocaleString('ko-KR')} 원
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-blue-200 dark:border-blue-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>현재 월간 전환수:</span>
                        <span className="font-medium">{currentMonthlyConversions.toFixed(0)}건</span>
                      </div>
                      <div className="flex justify-between">
                        <span>개선된 월간 전환수:</span>
                        <span className="font-medium">{improvedMonthlyConversions.toFixed(0)}건</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI 분석 버튼 */}
                <div className="pt-4 border-t border-blue-200 dark:border-blue-700">
                  <button
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI 분석 중...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI 맞춤형 개선 전략 받기
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI 분석 결과 */}
        {aiAnalysis && (
          <div className="mt-6 space-y-6">
            {/* AI 분석 텍스트 결과 */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg shadow-lg p-6 sm:p-8 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h2 className="text-2xl font-semibold text-purple-800 dark:text-purple-200">
                  AI 맞춤형 개선 전략
                </h2>
              </div>
            <div 
              className="prose prose-sm max-w-none dark:prose-invert text-gray-800 dark:text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAnalysis) }}
            />
            </div>
          </div>
        )}

        {/* AI 분석 오류 */}
        {aiError && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">오류: {aiError}</span>
            </div>
          </div>
        )}

        {hasValidInputs && (
          <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              결과 해석 가이드
            </h2>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <h3 className="font-semibold mb-2 text-foreground">📊 전환율 개선 효과 요약</h3>
                <p className="mb-2">
                  현재 전환율 <strong>{currentConversionRate}%</strong>에서 <strong>{improvedConversionRate}%</strong>로 개선하면,
                  월간 <strong>{additionalConversions.toFixed(0)}건</strong>의 추가 전환이 예상됩니다.
                </p>
                <p>
                  이는 월간 <strong>{monthlyRevenueIncrease.toLocaleString('ko-KR')}원</strong>,
                  연간 <strong>{yearlyRevenueIncrease.toLocaleString('ko-KR')}원</strong>의 매출 증가로 이어집니다.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-2 text-foreground">🧪 A/B 테스트 권장사항</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>랜딩 페이지 디자인, CTA 버튼 위치/색상, 제품 설명 등을 테스트해보세요</li>
                  <li>최소 2주 이상의 테스트 기간을 설정하여 통계적 유의성을 확보하세요</li>
                  <li>샘플 크기가 충분한지 확인하세요 (월간 방문자 수의 10% 이상 권장)</li>
                  <li>한 번에 하나의 요소만 변경하여 어떤 요소가 효과적인지 명확히 파악하세요</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-2 text-foreground">💼 비즈니스 임팩트</h3>
                <p className="mb-2">
                  전환율 개선은 마케팅 비용을 증가시키지 않고도 매출을 늘릴 수 있는 가장 효율적인 방법 중 하나입니다.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>같은 광고 예산으로 더 많은 매출을 창출할 수 있습니다</li>
                  <li>고객 획득 비용(CAC)을 낮추어 수익성을 개선할 수 있습니다</li>
                  <li>장기적으로 브랜드 신뢰도와 고객 만족도를 향상시킬 수 있습니다</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-2 text-foreground">🚀 다음 단계 제안</h3>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>웹사이트 분석 도구(Google Analytics 등)로 현재 전환율을 정확히 측정하세요</li>
                  <li>전환율이 낮은 페이지를 식별하고 개선 포인트를 찾아보세요</li>
                  <li>경쟁사 사이트를 벤치마킹하여 차별화 포인트를 발견하세요</li>
                  <li>사용자 피드백을 수집하고 실제 고객의 니즈를 반영하세요</li>
                  <li>작은 개선부터 시작하여 점진적으로 전환율을 향상시키세요</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            계산 공식 안내
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <strong>현재 월간 전환수</strong> = 월간 방문자 수 × (현재 전환율 ÷ 100)
            </li>
            <li>
              <strong>개선된 월간 전환수</strong> = 월간 방문자 수 × (개선된 전환율 ÷ 100)
            </li>
            <li>
              <strong>추가 확보 전환수</strong> = 개선된 월간 전환수 - 현재 월간 전환수
            </li>
            <li>
              <strong>월간 예상 매출 증가액</strong> = 추가 확보 전환수 × 평균 주문 금액
            </li>
            <li>
              <strong>연간 예상 매출 증가액</strong> = 월간 예상 매출 증가액 × 12
            </li>
            <li>
              <strong>전환율 개선률</strong> = ((개선된 전환율 - 현재 전환율) ÷ 현재 전환율) × 100
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
