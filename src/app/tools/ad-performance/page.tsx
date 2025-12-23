'use client';

import { useState } from 'react';
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

interface Product {
  id: string;
  name: string;
  price: number; // 판매가
  profitPerUnit: number; // 개당 순이익
  adCost: number; // 광고비
  conversions: number; // 전환수
}

interface CalculatedResult {
  revenue: number; // 매출
  roas: number; // ROAS
  roi: number; // ROI
  netProfit: number; // 순이익
}

export default function AdPerformancePage() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: '상품 1',
      price: 0,
      profitPerUnit: 0,
      adCost: 0,
      conversions: 0,
    },
  ]);
  const [calculatedResults, setCalculatedResults] = useState<Map<string, CalculatedResult>>(new Map());
  const [bestProductId, setBestProductId] = useState<string | null>(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // 계산 함수
  const calculateMetrics = (product: Product): CalculatedResult => {
    console.log('계산 시작:', product);
    
    const revenue = product.price * product.conversions;
    const roas = product.adCost > 0 ? revenue / product.adCost : 0;
    const totalProfit = product.profitPerUnit * product.conversions;
    const netProfit = totalProfit - product.adCost;
    const roi = product.adCost > 0 ? (netProfit / product.adCost) * 100 : 0;

    const result = {
      revenue,
      roas,
      roi,
      netProfit,
    };

    console.log('계산 결과:', result);
    return result;
  };

  // 계산하기 버튼 클릭
  const handleCalculate = () => {
    console.log('=== 계산하기 버튼 클릭 ===');
    const results = new Map<string, CalculatedResult>();
    let maxProfit = -Infinity;
    let bestId: string | null = null;

    products.forEach((product) => {
      const result = calculateMetrics(product);
      results.set(product.id, result);

      if (result.netProfit > maxProfit) {
        maxProfit = result.netProfit;
        bestId = product.id;
      }
    });

    console.log('최고 순이익 상품 ID:', bestId, '순이익:', maxProfit);
    setCalculatedResults(results);
    setBestProductId(bestId);
    setIsCalculated(true);
  };

  // 행 추가
  const handleAddRow = () => {
    console.log('행 추가');
    const newProduct: Product = {
      id: Date.now().toString(),
      name: `상품 ${products.length + 1}`,
      price: 0,
      profitPerUnit: 0,
      adCost: 0,
      conversions: 0,
    };
    setProducts([...products, newProduct]);
  };

  // 행 삭제
  const handleDeleteRow = (id: string) => {
    console.log('행 삭제:', id);
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id));
      calculatedResults.delete(id);
      if (bestProductId === id) {
        setBestProductId(null);
      }
    }
  };

  // 입력값 변경
  const handleInputChange = (id: string, field: keyof Product, value: string) => {
    console.log(`입력 변경 - ${id}: ${field} = ${value}`);
    setProducts(
      products.map((p) =>
        p.id === id ? { ...p, [field]: parseFloat(value) || 0 } : p
      )
    );
    // 입력값이 변경되면 계산 결과 및 AI 분석 결과 초기화
    if (isCalculated) {
      setIsCalculated(false);
      setBestProductId(null);
      setAiAnalysis(null);
    }
  };

  // 상품명 변경
  const handleNameChange = (id: string, value: string) => {
    console.log(`상품명 변경 - ${id}: ${value}`);
    setProducts(
      products.map((p) => (p.id === id ? { ...p, name: value } : p))
    );
  };

  // AI로 상품 정보 추정
  const handleAIEstimate = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product || !product.name.trim()) {
      alert('상품명을 먼저 입력해주세요.');
      return;
    }

    console.log('=== AI 상품 정보 추정 시작 ===', product.name);
    setLoadingProductId(id);

    try {
      const response = await fetch('/api/estimate-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: product.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '상품 정보 추정에 실패했습니다.');
        return;
      }

      if (result.success && result.data) {
        console.log('AI 추정 결과:', result.data);
        console.log('기존 상품 정보:', product);
        setProducts(
          products.map((p) =>
            p.id === id
              ? {
                  ...p,
                  // 기존 값이 0이 아닌 경우 유지, 0인 경우만 AI 결과로 채우기
                  price: p.price !== 0 ? p.price : result.data.price,
                  profitPerUnit: p.profitPerUnit !== 0 ? p.profitPerUnit : result.data.profitPerUnit,
                  adCost: p.adCost !== 0 ? p.adCost : result.data.adCost,
                  conversions: p.conversions !== 0 ? p.conversions : result.data.conversions,
                }
              : p
          )
        );
        // 입력값이 변경되면 계산 결과 및 AI 분석 결과 초기화
        if (isCalculated) {
          setIsCalculated(false);
          setBestProductId(null);
          setAiAnalysis(null);
        }
      } else {
        console.error('응답 형식 오류:', result);
        alert('상품 정보 추정에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 추정 오류:', error);
      alert('상품 정보 추정 중 오류가 발생했습니다.');
    } finally {
      setLoadingProductId(null);
    }
  };

  // AI로 전체 데이터 분석
  const handleAIAnalysis = async () => {
    if (!isCalculated || calculatedResults.size === 0) {
      alert('먼저 계산하기 버튼을 눌러 성과를 계산해주세요.');
      return;
    }

    console.log('=== AI 광고 성과 분석 시작 ===');
    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      // Map을 일반 객체로 변환
      const resultsObject: Record<string, CalculatedResult> = {};
      calculatedResults.forEach((value, key) => {
        resultsObject[key] = value;
      });

      const response = await fetch('/api/analyze-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products,
          results: resultsObject,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '광고 성과 분석에 실패했습니다.');
        return;
      }

      if (result.success && result.analysis) {
        console.log('AI 분석 완료');
        setAiAnalysis(result.analysis);
      } else {
        console.error('응답 형식 오류:', result);
        alert('광고 성과 분석에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert('광고 성과 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 마크다운을 간단한 HTML로 변환하는 함수
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

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          광고 성과 계산 도구
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          여러 상품의 광고 성과를 비교하고 최적의 상품을 찾아보세요
        </p>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 sm:p-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700">
                <th className="text-left p-3 font-semibold text-sm">상품명</th>
                <th className="text-left p-3 font-semibold text-sm">판매가</th>
                <th className="text-left p-3 font-semibold text-sm">개당 순이익</th>
                <th className="text-left p-3 font-semibold text-sm">광고비</th>
                <th className="text-left p-3 font-semibold text-sm">전환수</th>
                <th className="text-left p-3 font-semibold text-sm">매출</th>
                <th className="text-left p-3 font-semibold text-sm">ROAS</th>
                <th className="text-left p-3 font-semibold text-sm">ROI (%)</th>
                <th className="text-left p-3 font-semibold text-sm">순이익</th>
                <th className="text-left p-3 font-semibold text-sm">삭제</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const result = calculatedResults.get(product.id);
                const isBest = bestProductId === product.id && isCalculated;

                return (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-200 dark:border-gray-800 transition-colors ${
                      isBest
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => handleNameChange(product.id, e.target.value)}
                          placeholder="상품명 입력"
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                        />
                        <button
                          onClick={() => handleAIEstimate(product.id)}
                          disabled={loadingProductId === product.id || !product.name.trim()}
                          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs whitespace-nowrap transition-colors"
                          title="AI로 상품 정보 자동 입력"
                        >
                          {loadingProductId === product.id ? 'AI 분석 중...' : '🤖 AI 추정'}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={product.price || ''}
                        onChange={(e) =>
                          handleInputChange(product.id, 'price', e.target.value)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={product.profitPerUnit || ''}
                        onChange={(e) =>
                          handleInputChange(
                            product.id,
                            'profitPerUnit',
                            e.target.value
                          )
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={product.adCost || ''}
                        onChange={(e) =>
                          handleInputChange(product.id, 'adCost', e.target.value)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={product.conversions || ''}
                        onChange={(e) =>
                          handleInputChange(
                            product.id,
                            'conversions',
                            e.target.value
                          )
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                      />
                    </td>
                    <td className="p-3 text-sm">
                      {result
                        ? result.revenue.toLocaleString('ko-KR')
                        : '-'}
                    </td>
                    <td className="p-3 text-sm">
                      {result ? `${(result.roas * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="p-3 text-sm">
                      {result
                        ? `${result.roi.toFixed(2)}%`
                        : '-'}
                    </td>
                    <td className="p-3 text-sm font-semibold">
                      {result
                        ? result.netProfit.toLocaleString('ko-KR')
                        : '-'}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteRow(product.id)}
                        disabled={products.length === 1}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              onClick={handleAddRow}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              행 추가
            </button>
            <button
              onClick={handleCalculate}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              계산하기
            </button>
            {isCalculated && (
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
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
            )}
          </div>

          {isCalculated && bestProductId && (
            <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                🏆 최고 순이익 상품:{' '}
                <span className="text-base">
                  {products.find((p) => p.id === bestProductId)?.name}
                </span>
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                순이익:{' '}
                {calculatedResults
                  .get(bestProductId)
                  ?.netProfit.toLocaleString('ko-KR')}{' '}
                원
              </p>
            </div>
          )}
        </div>

        {isCalculated && bestProductId && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
              📊 결과 해석
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
                <strong className="text-blue-600 dark:text-blue-400">
                  {products.find((p) => p.id === bestProductId)?.name}
                </strong>
                이(가){' '}
                <strong className="text-blue-600 dark:text-blue-400">
                  {calculatedResults
                    .get(bestProductId)
                    ?.netProfit.toLocaleString('ko-KR')}
                  원
                </strong>
                의 순이익(ROI:{' '}
                <strong className="text-blue-600 dark:text-blue-400">
                  {calculatedResults
                    .get(bestProductId)
                    ?.roi.toFixed(2)}%
                </strong>
                )으로 가장 성과가 좋습니다.
              </p>
              {calculatedResults.get(bestProductId) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">매출:</span>
                      <span className="ml-2 font-semibold text-gray-800 dark:text-gray-200">
                        {calculatedResults
                          .get(bestProductId)
                          ?.revenue.toLocaleString('ko-KR')}
                        원
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">ROAS:</span>
                      <span className="ml-2 font-semibold text-gray-800 dark:text-gray-200">
                        {(calculatedResults.get(bestProductId)?.roas || 0).toFixed(2)}배
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {aiAnalysis && (
          <div className="mt-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
            <h2 className="text-2xl font-bold mb-4 text-purple-900 dark:text-purple-100 flex items-center gap-2">
              🤖 AI 종합 분석 결과
            </h2>
            
            {/* 비교 분석 시각화 섹션 */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                📊 상품별 성과 비교
              </h3>
              
              {/* CSS 기반 비교 표 */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-700">
                      <th className="text-left p-3 font-semibold">상품명</th>
                      <th className="text-right p-3 font-semibold">순이익</th>
                      <th className="text-right p-3 font-semibold">ROI</th>
                      <th className="text-right p-3 font-semibold">ROAS</th>
                      <th className="text-right p-3 font-semibold">매출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const result = calculatedResults.get(product.id);
                      if (!result) return null;
                      const isBest = bestProductId === product.id;
                      
                      return (
                        <tr 
                          key={product.id}
                          className={`border-b border-gray-200 dark:border-gray-700 ${
                            isBest ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                          }`}
                        >
                          <td className="p-3 font-medium">
                            {product.name}
                            {isBest && <span className="ml-2 text-yellow-600">🏆</span>}
                          </td>
                          <td className="p-3 text-right">
                            {result.netProfit.toLocaleString('ko-KR')}원
                          </td>
                          <td className="p-3 text-right">
                            {result.roi.toFixed(2)}%
                          </td>
                          <td className="p-3 text-right">
                            {result.roas.toFixed(2)}배
                          </td>
                          <td className="p-3 text-right">
                            {result.revenue.toLocaleString('ko-KR')}원
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* CSS 기반 막대 차트 - 순이익 비교 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3 text-foreground">
                  순이익 비교
                </h4>
                <div className="space-y-3">
                  {products.map((product) => {
                    const result = calculatedResults.get(product.id);
                    if (!result) return null;
                    
                    const maxProfit = Math.max(
                      ...Array.from(calculatedResults.values()).map(r => r.netProfit)
                    );
                    const percentage = maxProfit > 0 ? (result.netProfit / maxProfit) * 100 : 0;
                    const isBest = bestProductId === product.id;
                    
                    return (
                      <div key={product.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {product.name}
                            {isBest && <span className="ml-1">🏆</span>}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {result.netProfit.toLocaleString('ko-KR')}원
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isBest
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                                : 'bg-gradient-to-r from-blue-400 to-blue-600'
                            }`}
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CSS 기반 막대 차트 - ROI 비교 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3 text-foreground">
                  ROI 비교
                </h4>
                <div className="space-y-3">
                  {products.map((product) => {
                    const result = calculatedResults.get(product.id);
                    if (!result) return null;
                    
                    const maxROI = Math.max(
                      ...Array.from(calculatedResults.values()).map(r => r.roi)
                    );
                    const percentage = maxROI > 0 ? (result.roi / maxROI) * 100 : 0;
                    const isBest = bestProductId === product.id;
                    
                    return (
                      <div key={product.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {product.name}
                            {isBest && <span className="ml-1">🏆</span>}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {result.roi.toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isBest
                                ? 'bg-gradient-to-r from-green-400 to-green-600'
                                : 'bg-gradient-to-r from-purple-400 to-purple-600'
                            }`}
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recharts를 사용한 고급 차트 */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-foreground">
                  📈 상세 차트 분석
                </h3>
                
                {/* 차트 데이터 준비 */}
                {(() => {
                  const chartData = products
                    .map((product) => {
                      const result = calculatedResults.get(product.id);
                      if (!result) return null;
                      return {
                        name: product.name,
                        순이익: result.netProfit,
                        ROI: result.roi,
                        ROAS: result.roas * 100, // 퍼센트로 표시
                        매출: result.revenue,
                        광고비: product.adCost,
                      };
                    })
                    .filter((item) => item !== null);

                  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

                  return (
                    <div className="space-y-6">
                      {/* 막대 차트 - 순이익 및 ROI */}
                      <div>
                        <h4 className="text-lg font-semibold mb-3 text-foreground">
                          순이익 및 ROI 비교
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              stroke="currentColor"
                              opacity={0.2}
                            />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: 'currentColor', fontSize: 12 }}
                              stroke="currentColor"
                            />
                            <YAxis 
                              yAxisId="left"
                              tick={{ fill: 'currentColor', fontSize: 12 }}
                              stroke="currentColor"
                            />
                            <YAxis 
                              yAxisId="right" 
                              orientation="right"
                              tick={{ fill: 'currentColor', fontSize: 12 }}
                              stroke="currentColor"
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) => {
                                if (name === '순이익' || name === '매출' || name === '광고비') {
                                  return [`${value.toLocaleString('ko-KR')}원`, name];
                                }
                                if (name === 'ROI') {
                                  return [`${value.toFixed(2)}%`, name];
                                }
                                if (name === 'ROAS') {
                                  return [`${value.toFixed(2)}%`, name];
                                }
                                return [value, name];
                              }}
                            />
                            <Bar 
                              yAxisId="left"
                              dataKey="순이익" 
                              fill="#3b82f6" 
                              name="순이익 (원)"
                              radius={[8, 8, 0, 0]}
                            />
                            <Bar 
                              yAxisId="right"
                              dataKey="ROI" 
                              fill="#10b981" 
                              name="ROI (%)"
                              radius={[8, 8, 0, 0]}
                            />
                            <Legend />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* 선 그래프 - 매출 및 광고비 */}
                      <div>
                        <h4 className="text-lg font-semibold mb-3 text-foreground">
                          매출 및 광고비 추이
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              stroke="currentColor"
                              opacity={0.2}
                            />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: 'currentColor', fontSize: 12 }}
                              stroke="currentColor"
                            />
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
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="매출" 
                              stroke="#8b5cf6" 
                              strokeWidth={3}
                              name="매출 (원)"
                              dot={{ r: 6 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="광고비" 
                              stroke="#ef4444" 
                              strokeWidth={3}
                              name="광고비 (원)"
                              dot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* 원형 차트 - 순이익 비율 */}
                      <div>
                        <h4 className="text-lg font-semibold mb-3 text-foreground">
                          순이익 비율 분포
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="순이익"
                            >
                              {chartData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number) => `${value.toLocaleString('ko-KR')}원`}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
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

        <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            계산 공식 안내
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <strong>매출</strong> = 판매가 × 전환수
            </li>
            <li>
              <strong>ROAS</strong> = 매출 ÷ 광고비
            </li>
            <li>
              <strong>ROI</strong> = (순이익 - 광고비) ÷ 광고비 × 100
            </li>
            <li>
              <strong>순이익</strong> = (개당 순이익 × 전환수) - 광고비
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

