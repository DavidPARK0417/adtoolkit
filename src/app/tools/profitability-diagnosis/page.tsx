'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
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

export default function ProfitabilityDiagnosisPage() {
  // 공통 상품명
  const [productName, setProductName] = useState<string>('');
  const [isLoadingStep1, setIsLoadingStep1] = useState<boolean>(false);
  const [isLoadingStep2, setIsLoadingStep2] = useState<boolean>(false);
  const [isLoadingStep3, setIsLoadingStep3] = useState<boolean>(false);
  
  // AI 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  // 1단계: 목표 CPA 상태
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const targetCPA = sellingPrice - cost;

  // 2단계: LTV 상태
  const [orderAmount, setOrderAmount] = useState<number>(0);
  const [purchaseFrequency, setPurchaseFrequency] = useState<number>(0);
  const ltv = orderAmount * purchaseFrequency;

  // 3단계: LTV:CAC 비율 상태
  const [ltvForRatio, setLtvForRatio] = useState<number>(0);
  const [cac, setCac] = useState<number>(0);
  const ratio = cac > 0 ? ltvForRatio / cac : 0;
  const healthStatus =
    ratio >= 3 ? '건강함' : ratio >= 1 ? '보통' : '개선 필요';
  const healthColor =
    ratio >= 3
      ? 'text-green-600 dark:text-green-400'
      : ratio >= 1
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';
  const healthBgColor =
    ratio >= 3
      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
      : ratio >= 1
        ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
        : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';

  // LTV 계산 후 자동으로 3단계에 반영
  useEffect(() => {
    if (ltv > 0) {
      setLtvForRatio(ltv);
    }
  }, [ltv]);

  const handleCalculateCPA = () => {
    console.log('=== 목표 CPA 계산 ===');
    console.log('판매가:', sellingPrice);
    console.log('원가:', cost);
    console.log('계산된 목표 CPA:', targetCPA);
  };

  const handleCalculateLTV = () => {
    console.log('=== LTV 계산 ===');
    console.log('주문액:', orderAmount);
    console.log('구매 빈도:', purchaseFrequency);
    console.log('계산된 LTV:', ltv);
  };

  const handleCalculateRatio = () => {
    console.log('=== LTV:CAC 비율 계산 ===');
    console.log('LTV:', ltvForRatio);
    console.log('CAC:', cac);
    console.log('비율:', ratio);
    console.log('건전성 판정:', healthStatus);
  };

  // AI 종합 분석 함수
  const handleAIAnalysis = async () => {
    if (targetCPA === 0 && ltv === 0 && ratio === 0) {
      alert('먼저 3단계까지 계산을 완료해주세요.');
      return;
    }

    console.log('=== AI 수익성 진단 종합 분석 시작 ===');
    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      const response = await fetch('/api/analyze-profitability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName,
          targetCPA,
          ltv,
          ratio,
          healthStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '수익성 진단 분석에 실패했습니다.');
        return;
      }

      if (result.success && result.analysis) {
        console.log('AI 분석 완료');
        setAiAnalysis(result.analysis);
      } else {
        console.error('응답 형식 오류:', result);
        alert('수익성 진단 분석에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert('수익성 진단 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 마크다운 렌더링 함수
  const renderMarkdown = (text: string) => {
    const html = text;
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
      
      if (inList && line === '') {
        processedLines.push('</ul>');
        inList = false;
        continue;
      }
      
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
    
    if (inList) {
      processedLines.push('</ul>');
    }
    
    return processedLines.join('\n');
  };

  // 차트 데이터 준비
  const profitabilityData = [
    {
      name: '목표 CPA',
      value: targetCPA,
      fill: '#3b82f6',
    },
    {
      name: 'LTV',
      value: ltv,
      fill: '#10b981',
    },
    {
      name: 'CAC',
      value: cac,
      fill: '#ef4444',
    },
  ].filter(item => item.value > 0);

  const ratioData = [
    {
      name: 'LTV:CAC 비율',
      value: ratio,
      fill: ratio >= 3 ? '#10b981' : ratio >= 1 ? '#f59e0b' : '#ef4444',
    },
  ].filter(item => item.value > 0);

  // AI로 1단계 정보 추정
  const handleAIEstimateStep1 = async () => {
    if (!productName.trim()) {
      alert('상품명을 먼저 입력해주세요.');
      return;
    }

    console.log('=== AI 1단계 정보 추정 시작 ===', productName);
    setIsLoadingStep1(true);

    try {
      const response = await fetch('/api/estimate-profitability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: productName,
          step: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '정보 추정에 실패했습니다.');
        return;
      }

      if (result.success && result.data) {
        console.log('AI 추정 결과:', result.data);
        console.log('기존 1단계 정보 - 판매가:', sellingPrice, '원가:', cost);
        // 기존 값이 0이 아닌 경우 유지, 0인 경우만 AI 결과로 채우기
        if (sellingPrice === 0) {
          setSellingPrice(result.data.sellingPrice);
        }
        if (cost === 0) {
          setCost(result.data.cost);
        }
      } else {
        console.error('응답 형식 오류:', result);
        alert('정보 추정에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 추정 오류:', error);
      alert('정보 추정 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingStep1(false);
    }
  };

  // AI로 2단계 정보 추정
  const handleAIEstimateStep2 = async () => {
    if (!productName.trim()) {
      alert('상품명을 먼저 입력해주세요.');
      return;
    }

    console.log('=== AI 2단계 정보 추정 시작 ===', productName);
    setIsLoadingStep2(true);

    try {
      const response = await fetch('/api/estimate-profitability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: productName,
          step: 2,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '정보 추정에 실패했습니다.');
        return;
      }

      if (result.success && result.data) {
        console.log('AI 추정 결과:', result.data);
        console.log('기존 2단계 정보 - 주문금액:', orderAmount, '구매빈도:', purchaseFrequency);
        // 기존 값이 0이 아닌 경우 유지, 0인 경우만 AI 결과로 채우기
        if (orderAmount === 0) {
          setOrderAmount(result.data.orderAmount);
        }
        if (purchaseFrequency === 0) {
          setPurchaseFrequency(result.data.purchaseFrequency);
        }
      } else {
        console.error('응답 형식 오류:', result);
        alert('정보 추정에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 추정 오류:', error);
      alert('정보 추정 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingStep2(false);
    }
  };

  // AI로 3단계 정보 추정
  const handleAIEstimateStep3 = async () => {
    if (!productName.trim()) {
      alert('상품명을 먼저 입력해주세요.');
      return;
    }

    console.log('=== AI 3단계 정보 추정 시작 ===', productName);
    setIsLoadingStep3(true);

    try {
      const response = await fetch('/api/estimate-profitability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: productName,
          step: 3,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '정보 추정에 실패했습니다.');
        return;
      }

      if (result.success && result.data) {
        console.log('AI 추정 결과:', result.data);
        console.log('기존 3단계 정보 - LTV:', ltvForRatio, 'CAC:', cac);
        // 기존 값이 0이 아닌 경우 유지, 0인 경우만 AI 결과로 채우기
        if (ltvForRatio === 0) {
          setLtvForRatio(result.data.ltv);
        }
        if (cac === 0) {
          setCac(result.data.cac);
        }
      } else {
        console.error('응답 형식 오류:', result);
        alert('정보 추정에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 추정 오류:', error);
      alert('정보 추정 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingStep3(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          마케팅 수익성 진단 도구
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
          3단계로 구성된 수익성 진단 도구로 광고 예산을 최적화하세요
        </p>

        <div className="space-y-8">
          {/* 공통 상품명 입력 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-foreground">
                상품명
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => {
                  console.log('상품명 변경:', e.target.value);
                  setProductName(e.target.value);
                }}
                placeholder="예: 스마트폰 케이스, 온라인 강의 등"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
              />
            </div>
          </div>

          {/* 1단계: 목표 CPA 계산기 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8">
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-foreground">
                1단계: 목표 CPA 계산기
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                판매가와 원가를 기반으로 1회 전환당 최대 광고비를 계산하세요
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex gap-2 items-end mb-2">
                  <label className="block text-sm font-medium text-foreground flex-1">
                    판매가 (원)
                  </label>
                  <button
                    onClick={handleAIEstimateStep1}
                    disabled={isLoadingStep1 || !productName.trim()}
                    className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs whitespace-nowrap"
                    title="AI로 1단계 정보 자동 입력"
                  >
                    {isLoadingStep1 ? 'AI 분석 중...' : '🤖 AI 추정'}
                  </button>
                </div>
                <input
                  type="number"
                  value={sellingPrice || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    console.log('판매가 변경:', value);
                    setSellingPrice(value);
                  }}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  원가 (원)
                </label>
                <input
                  type="number"
                  value={cost || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    console.log('원가 변경:', value);
                    setCost(value);
                  }}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                />
              </div>

              <button
                onClick={handleCalculateCPA}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                계산하기
              </button>
            </div>

            {(sellingPrice > 0 || cost > 0) && (
              <div className="mt-8 space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    계산 결과
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">
                        1회 전환당 최대 광고비:
                      </span>
                      <span className="font-semibold text-foreground">
                        {targetCPA.toLocaleString('ko-KR')} 원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                계산 공식 안내
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>
                  <strong>목표 CPA</strong> = 판매가 - 원가
                </li>
                <li className="mt-4 text-gray-600 dark:text-gray-400">
                  목표 CPA는 1회 전환당 지출할 수 있는 최대 광고비를 의미합니다.
                  이 값을 기준으로 광고 예산을 설정하면 수익성을 유지할 수
                  있습니다.
                </li>
              </ul>
            </div>
          </div>

          {/* 2단계: LTV 계산기 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8">
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-foreground">
                2단계: LTV 계산기
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                주문액과 구매 빈도로 고객 생애 가치를 계산하세요
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex gap-2 items-end mb-2">
                  <label className="block text-sm font-medium text-foreground flex-1">
                    주문액 (원)
                  </label>
                  <button
                    onClick={handleAIEstimateStep2}
                    disabled={isLoadingStep2 || !productName.trim()}
                    className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs whitespace-nowrap"
                    title="AI로 2단계 정보 자동 입력"
                  >
                    {isLoadingStep2 ? 'AI 분석 중...' : '🤖 AI 추정'}
                  </button>
                </div>
                <input
                  type="number"
                  value={orderAmount || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    console.log('주문액 변경:', value);
                    setOrderAmount(value);
                  }}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  평균 주문 금액을 입력하세요
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  구매 빈도 (회)
                </label>
                <input
                  type="number"
                  value={purchaseFrequency || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    console.log('구매 빈도 변경:', value);
                    setPurchaseFrequency(value);
                  }}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  고객당 평균 구매 횟수를 입력하세요 (예: 3회)
                </p>
              </div>

              <button
                onClick={handleCalculateLTV}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                계산하기
              </button>
            </div>

            {(orderAmount > 0 || purchaseFrequency > 0) && (
              <div className="mt-8 space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    계산 결과
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">
                        고객 생애 가치:
                      </span>
                      <span className="font-semibold text-foreground">
                        {ltv.toLocaleString('ko-KR')} 원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                계산 공식 안내
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>
                  <strong>LTV (고객 생애 가치)</strong> = 주문액 × 구매 빈도
                </li>
                <li className="mt-4 text-gray-600 dark:text-gray-400">
                  LTV는 한 고객이 평생 동안 기업에 가져다주는 총 수익을 의미합니다.
                  이 값을 통해 고객 획득에 투자할 수 있는 적정 비용을 판단할 수
                  있습니다.
                </li>
              </ul>
            </div>
          </div>

          {/* 3단계: LTV:CAC 비율 계산기 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8">
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-foreground">
                3단계: LTV:CAC 비율 계산기
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                LTV와 CAC를 입력받아 마케팅 건전성을 진단하세요
              </p>
            </div>

            <div className="space-y-6">
              {ltv > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    💡 2단계에서 계산된 LTV 값이 자동으로 입력되었습니다: {ltv.toLocaleString('ko-KR')} 원
                  </p>
                </div>
              )}

              <div>
                <div className="flex gap-2 items-end mb-2">
                  <label className="block text-sm font-medium text-foreground flex-1">
                    LTV (원)
                  </label>
                  <button
                    onClick={handleAIEstimateStep3}
                    disabled={isLoadingStep3 || !productName.trim()}
                    className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs whitespace-nowrap"
                    title="AI로 3단계 정보 자동 입력"
                  >
                    {isLoadingStep3 ? 'AI 분석 중...' : '🤖 AI 추정'}
                  </button>
                </div>
                <input
                  type="number"
                  value={ltvForRatio || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    console.log('LTV 변경:', value);
                    setLtvForRatio(value);
                  }}
                  placeholder={ltv > 0 ? ltv.toString() : '0'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  고객 생애 가치를 입력하세요 (2단계에서 계산된 값이 자동 입력됩니다)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  CAC (원)
                </label>
                <input
                  type="number"
                  value={cac || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    console.log('CAC 변경:', value);
                    setCac(value);
                  }}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  고객 획득 비용을 입력하세요
                </p>
              </div>

              <button
                onClick={handleCalculateRatio}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                계산하기
              </button>
            </div>

            {(ltvForRatio > 0 || cac > 0) && (
              <div className="mt-8 space-y-4">
                <div className={`p-4 ${healthBgColor} rounded-lg border`}>
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    계산 결과
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">
                        LTV:CAC 비율:
                      </span>
                      <span className="font-semibold text-foreground">
                        {ratio.toFixed(2)}:1
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300">
                        마케팅 건전성:
                      </span>
                      <span className={`font-semibold ${healthColor}`}>
                        {healthStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                계산 공식 안내
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>
                  <strong>LTV:CAC 비율</strong> = LTV ÷ CAC
                </li>
                <li className="mt-4 text-gray-600 dark:text-gray-400">
                  <strong>건전성 판정 기준:</strong>
                </li>
                <li className="text-gray-600 dark:text-gray-400">
                  • 3:1 이상: 건강함 - 마케팅 투자가 효율적입니다
                </li>
                <li className="text-gray-600 dark:text-gray-400">
                  • 1:1 ~ 3:1: 보통 - 개선 여지가 있습니다
                </li>
                <li className="text-gray-600 dark:text-gray-400">
                  • 1:1 미만: 개선 필요 - 고객 획득 비용이 너무 높거나 LTV가 낮습니다
                </li>
              </ul>
            </div>
          </div>

          {/* AI 종합 분석 섹션 */}
          {(targetCPA > 0 || ltv > 0 || ratio > 0) && (
            <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-4 text-foreground">
                AI 종합 분석
              </h2>
              
              {/* AI 종합 분석 버튼 */}
              <div className="mb-6">
                <button
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                  className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      AI 분석 중...
                    </>
                  ) : (
                    <>
                      🤖 AI 종합 분석
                    </>
                  )}
                </button>
              </div>

              {/* AI 분석 결과 표시 */}
              {aiAnalysis && (
                <div className="mt-6 space-y-6">
                  {/* 시각화 차트 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
                    <h3 className="text-xl font-semibold mb-4 text-foreground">
                      📊 데이터 시각화
                    </h3>
                    
                    <div className="space-y-6">
                      {/* 수익성 지표 막대 차트 */}
                      {profitabilityData.length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold mb-3 text-foreground">
                            수익성 지표 비교
                          </h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={profitabilityData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} />
                              <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" />
                              <YAxis 
                                tick={{ fill: 'currentColor', fontSize: 12 }} 
                                stroke="currentColor"
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #ccc',
                                  borderRadius: '8px'
                                }}
                                formatter={(value: number) => `${value.toLocaleString('ko-KR')}원`}
                              />
                              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                {profitabilityData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                              <Legend />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* LTV:CAC 비율 파이 차트 */}
                      {ratioData.length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold mb-3 text-foreground">
                            LTV:CAC 비율 분석
                          </h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={ratioData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value.toFixed(2)}:1`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {ratioData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #ccc',
                                  borderRadius: '8px'
                                }}
                                formatter={(value: number) => `${value.toFixed(2)}:1`}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI 텍스트 분석 결과 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert text-gray-800 dark:text-gray-200 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAnalysis) }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
