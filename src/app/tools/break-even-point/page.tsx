'use client';

import { useState } from 'react';
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

export default function BreakEvenPointPage() {
  const [productName, setProductName] = useState<string>('');
  const [fixedCost, setFixedCost] = useState<number>(0);
  const [variableCost, setVariableCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // AI 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  const handleCalculate = () => {
    console.log('=== 손익분기점 계산 ===');
    console.log('고정비:', fixedCost);
    console.log('변동비:', variableCost);
    console.log('판매가:', sellingPrice);
  };

  // AI로 손익분기점 정보 추정
  const handleAIEstimate = async () => {
    if (!productName.trim()) {
      alert('상품명을 먼저 입력해주세요.');
      return;
    }

    console.log('=== AI 손익분기점 정보 추정 시작 ===', productName);
    setIsLoading(true);

    try {
      const response = await fetch('/api/estimate-break-even', {
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
        alert(result.error || '손익분기점 정보 추정에 실패했습니다.');
        return;
      }

      if (result.success && result.data) {
        console.log('AI 추정 결과:', result.data);
        // 기존 값이 0이 아닌 경우 유지, 0인 경우만 AI 결과로 채우기
        if (fixedCost === 0) {
          setFixedCost(result.data.fixedCost);
        }
        if (variableCost === 0) {
          setVariableCost(result.data.variableCost);
        }
        if (sellingPrice === 0) {
          setSellingPrice(result.data.sellingPrice);
        }
      } else {
        console.error('응답 형식 오류:', result);
        alert('손익분기점 정보 추정에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 추정 오류:', error);
      alert('손익분기점 정보 추정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 단위당 기여이익 = 판매가 - 변동비
  const contributionMargin = sellingPrice - variableCost;
  // 손익분기점 수량 = 고정비 / 단위당 기여이익
  const breakEvenQuantity = contributionMargin > 0 ? fixedCost / contributionMargin : 0;
  // 손익분기점 매출 = 손익분기점 수량 × 판매가
  const breakEvenRevenue = breakEvenQuantity * sellingPrice;

  // AI 종합 분석 함수
  const handleAIAnalysis = async () => {
    if (fixedCost === 0 && variableCost === 0 && sellingPrice === 0) {
      alert('먼저 계산을 수행해주세요.');
      return;
    }

    if (contributionMargin <= 0) {
      alert('손익분기점을 계산할 수 없습니다. 판매가가 변동비보다 높아야 합니다.');
      return;
    }

    console.log('=== AI 손익분기점 종합 분석 시작 ===');
    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      const response = await fetch('/api/analyze-break-even', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName,
          fixedCost,
          variableCost,
          sellingPrice,
          contributionMargin,
          breakEvenQuantity,
          breakEvenRevenue,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '손익분기점 분석에 실패했습니다.');
        return;
      }

      if (result.success && result.analysis) {
        console.log('AI 분석 완료');
        setAiAnalysis(result.analysis);
      } else {
        console.error('응답 형식 오류:', result);
        alert('손익분기점 분석에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert('손익분기점 분석 중 오류가 발생했습니다.');
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
  const costStructureData = [
    {
      name: '고정비',
      value: fixedCost,
      fill: '#ef4444',
    },
    {
      name: '변동비 (1개당)',
      value: variableCost,
      fill: '#f59e0b',
    },
    {
      name: '판매가 (1개당)',
      value: sellingPrice,
      fill: '#10b981',
    },
    {
      name: '기여이익 (1개당)',
      value: contributionMargin,
      fill: '#3b82f6',
    },
  ].filter(item => item.value > 0);

  const breakEvenAnalysisData = [
    {
      name: '손익분기점 수량',
      value: Math.ceil(breakEvenQuantity),
      fill: '#8b5cf6',
    },
  ].filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          손익분기점 계산기
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          고정비와 변동비를 기반으로 손익분기점을 계산하여 최소 판매 목표를 설정하세요
        </p>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                상품명
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
                  disabled={isLoading || !productName.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                  title="AI로 손익분기점 정보 자동 입력"
                >
                  {isLoading ? 'AI 분석 중...' : '🤖 AI 추정'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                총 고정비 (월세, 인건비 등) (원)
              </label>
              <input
                type="number"
                value={fixedCost || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  console.log('고정비 변경:', value);
                  setFixedCost(value);
                }}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                제품 1개당 변동비 (원가 등) (원)
              </label>
              <input
                type="number"
                value={variableCost || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  console.log('변동비 변경:', value);
                  setVariableCost(value);
                }}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                제품 1개당 판매가 (원)
              </label>
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

            <button
              onClick={handleCalculate}
              className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              계산하기
            </button>
          </div>

          {(fixedCost > 0 || variableCost > 0 || sellingPrice > 0) && (
            <div className="mt-8 space-y-4">
              {contributionMargin <= 0 && sellingPrice > 0 && variableCost > 0 ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                    경고
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    판매가가 변동비보다 낮거나 같아서 손익분기점을 달성할 수 없습니다.
                    판매가를 변동비보다 높게 설정해주세요.
                  </p>
                </div>
              ) : breakEvenQuantity > 0 ? (
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
                      목표 달성 메시지
                    </h3>
                    <p className="text-base font-bold text-green-900 dark:text-green-100">
                      손익분기점을 넘기려면 매월{' '}
                      <span className="text-2xl text-green-700 dark:text-green-300">
                        {Math.ceil(breakEvenQuantity).toLocaleString('ko-KR')}개
                      </span>
                      의 제품을 판매해야 합니다.
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      계산 결과
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">단위당 기여이익:</span>
                        <span className="font-semibold text-foreground">
                          {contributionMargin.toLocaleString('ko-KR')} 원
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">손익분기점 수량:</span>
                        <span className="font-semibold text-foreground">
                          {breakEvenQuantity.toFixed(2)} 개
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">손익분기점 매출:</span>
                        <span className="font-semibold text-foreground">
                          {breakEvenRevenue.toLocaleString('ko-KR')} 원
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI 종합 분석 버튼 */}
                  {breakEvenQuantity > 0 && (
                    <div className="mt-6">
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
                  )}

                  {/* AI 분석 결과 표시 */}
                  {aiAnalysis && (
                    <div className="mt-6 space-y-6">
                      {/* 시각화 차트 */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
                        <h3 className="text-xl font-semibold mb-4 text-foreground">
                          📊 데이터 시각화
                        </h3>
                        
                        <div className="space-y-6">
                          {/* 비용 구조 막대 차트 */}
                          {costStructureData.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-foreground">
                                비용 구조 분석
                              </h4>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={costStructureData}>
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
                                    {costStructureData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                  </Bar>
                                  <Legend />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* 손익분기점 파이 차트 */}
                          {breakEvenAnalysisData.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-foreground">
                                손익분기점 분석
                              </h4>
                              <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                  <Pie
                                    data={breakEvenAnalysisData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name}: ${value.toLocaleString('ko-KR')}개`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {breakEvenAnalysisData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                      border: '1px solid #ccc',
                                      borderRadius: '8px'
                                    }}
                                    formatter={(value: number) => `${value.toLocaleString('ko-KR')}개`}
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
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            계산 공식 안내
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <strong>단위당 기여이익</strong> = 판매가 - 변동비
            </li>
            <li>
              <strong>손익분기점 수량</strong> = 고정비 ÷ 단위당 기여이익
            </li>
            <li>
              <strong>손익분기점 매출</strong> = 손익분기점 수량 × 판매가
            </li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>손익분기점이란?</strong> 순이익이 0원이 되는 판매 수량입니다. 
              이 수량을 넘어서야 비로소 이익이 발생하기 시작합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

