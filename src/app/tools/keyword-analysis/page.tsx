'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Keyword {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: number;
  cpc: number;
}

export default function KeywordAnalysisPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([
    {
      id: '1',
      keyword: '',
      searchVolume: 0,
      competition: 0,
      cpc: 0,
    },
  ]);
  const [loadingKeywordId, setLoadingKeywordId] = useState<string | null>(null);
  
  // AI 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  const handleAddKeyword = () => {
    console.log('키워드 추가');
    const newKeyword: Keyword = {
      id: Date.now().toString(),
      keyword: '',
      searchVolume: 0,
      competition: 0,
      cpc: 0,
    };
    setKeywords([...keywords, newKeyword]);
  };

  const handleDeleteKeyword = (id: string) => {
    console.log('키워드 삭제:', id);
    if (keywords.length > 1) {
      setKeywords(keywords.filter((k) => k.id !== id));
    }
  };

  const handleInputChange = (id: string, field: keyof Keyword, value: string | number) => {
    console.log(`입력 변경 - ${id}: ${field} = ${value}`);
    setKeywords(
      keywords.map((k) =>
        k.id === id ? { ...k, [field]: value } : k
      )
    );
  };

  // AI로 키워드 정보 추정
  const handleAIEstimate = async (id: string) => {
    const keyword = keywords.find((k) => k.id === id);
    if (!keyword || !keyword.keyword.trim()) {
      alert('키워드를 먼저 입력해주세요.');
      return;
    }

    console.log('=== AI 키워드 정보 추정 시작 ===', keyword.keyword);
    setLoadingKeywordId(id);

    try {
      const response = await fetch('/api/estimate-keyword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keyword.keyword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '키워드 정보 추정에 실패했습니다.');
        return;
      }

      if (result.success && result.data) {
        console.log('AI 추정 결과:', result.data);
        console.log('기존 키워드 정보:', keyword);
        setKeywords(
          keywords.map((k) =>
            k.id === id
              ? {
                  ...k,
                  // 기존 값이 0이 아닌 경우 유지, 0인 경우만 AI 결과로 채우기
                  searchVolume: k.searchVolume !== 0 ? k.searchVolume : result.data.searchVolume,
                  competition: k.competition !== 0 ? k.competition : result.data.competition,
                  cpc: k.cpc !== 0 ? k.cpc : result.data.cpc,
                }
              : k
          )
        );
      } else {
        console.error('응답 형식 오류:', result);
        alert('키워드 정보 추정에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 추정 오류:', error);
      alert('키워드 정보 추정 중 오류가 발생했습니다.');
    } finally {
      setLoadingKeywordId(null);
    }
  };

  const calculateScore = (keyword: Keyword): number => {
    if (keyword.searchVolume === 0 || keyword.cpc === 0) return 0;
    // 점수 = 검색량 / (경쟁도 * CPC)
    const score = keyword.searchVolume / (keyword.competition * keyword.cpc || 1);
    return Math.round(score * 100) / 100;
  };

  const sortedKeywords = [...keywords].sort((a, b) => {
    const scoreA = calculateScore(a);
    const scoreB = calculateScore(b);
    return scoreB - scoreA;
  });

  // AI 종합 분석 함수
  const handleAIAnalysis = async () => {
    const validKeywords = keywords.filter(k => k.keyword.trim() && (k.searchVolume > 0 || k.cpc > 0 || k.competition > 0));
    
    if (validKeywords.length === 0) {
      alert('분석할 수 있는 키워드 데이터가 없습니다. 키워드 정보를 입력해주세요.');
      return;
    }

    console.log('=== AI 키워드 종합 분석 시작 ===');
    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      const keywordsWithScore = validKeywords.map(k => ({
        keyword: k.keyword,
        searchVolume: k.searchVolume,
        competition: k.competition,
        cpc: k.cpc,
        score: calculateScore(k),
      }));

      const response = await fetch('/api/analyze-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywordsWithScore,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API 오류:', result.error);
        alert(result.error || '키워드 분석에 실패했습니다.');
        return;
      }

      if (result.success && result.analysis) {
        console.log('AI 분석 완료');
        setAiAnalysis(result.analysis);
      } else {
        console.error('응답 형식 오류:', result);
        alert('키워드 분석에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 분석 오류:', error);
      alert('키워드 분석 중 오류가 발생했습니다.');
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
  const validKeywordsForChart = keywords.filter(k => k.keyword.trim() && (k.searchVolume > 0 || k.cpc > 0 || k.competition > 0));
  
  const keywordScoreData = validKeywordsForChart.map(k => ({
    name: k.keyword,
    점수: calculateScore(k),
  })).filter(item => item.점수 > 0);

  const keywordComparisonData = validKeywordsForChart.map(k => ({
    name: k.keyword,
    검색량: k.searchVolume,
    CPC: k.cpc,
    경쟁도: k.competition * 10, // 시각화를 위해 10배
  }));


  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          키워드 분석 도구
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          키워드의 검색량, 경쟁도, CPC를 분석하여 최적의 키워드를 찾아보세요
        </p>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 sm:p-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700">
                <th className="text-left p-3 font-semibold text-sm">키워드</th>
                <th className="text-left p-3 font-semibold text-sm">검색량</th>
                <th className="text-left p-3 font-semibold text-sm">경쟁도 (1-10)</th>
                <th className="text-left p-3 font-semibold text-sm">CPC (원)</th>
                <th className="text-left p-3 font-semibold text-sm">점수</th>
                <th className="text-left p-3 font-semibold text-sm">삭제</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((keyword) => {
                const score = calculateScore(keyword);
                const isTopScore = sortedKeywords[0]?.id === keyword.id && score > 0;

                return (
                  <tr
                    key={keyword.id}
                    className={`border-b border-gray-200 dark:border-gray-800 transition-colors ${
                      isTopScore
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={keyword.keyword}
                          onChange={(e) => handleInputChange(keyword.id, 'keyword', e.target.value)}
                          placeholder="키워드 입력"
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                        />
                        <button
                          onClick={() => handleAIEstimate(keyword.id)}
                          disabled={loadingKeywordId === keyword.id || !keyword.keyword.trim()}
                          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs whitespace-nowrap transition-colors"
                          title="AI로 키워드 정보 자동 입력"
                        >
                          {loadingKeywordId === keyword.id ? 'AI 분석 중...' : '🤖 AI 추정'}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={keyword.searchVolume || ''}
                        onChange={(e) =>
                          handleInputChange(keyword.id, 'searchVolume', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={keyword.competition || ''}
                        onChange={(e) =>
                          handleInputChange(keyword.id, 'competition', parseFloat(e.target.value) || 0)
                        }
                        placeholder="1-10"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={keyword.cpc || ''}
                        onChange={(e) =>
                          handleInputChange(keyword.id, 'cpc', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-foreground text-sm"
                      />
                    </td>
                    <td className="p-3 text-sm font-semibold">
                      {score > 0 ? score.toFixed(2) : '-'}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteKeyword(keyword.id)}
                        disabled={keywords.length === 1}
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

          <div className="mt-6">
            <button
              onClick={handleAddKeyword}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              키워드 추가
            </button>
          </div>

          {sortedKeywords[0] && calculateScore(sortedKeywords[0]) > 0 && (
            <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 rounded-lg">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                🏆 최고 점수 키워드:{' '}
                <span className="text-base">{sortedKeywords[0].keyword}</span>
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                점수: {calculateScore(sortedKeywords[0]).toFixed(2)}
              </p>
            </div>
          )}

          {/* AI 종합 분석 버튼 */}
          {validKeywordsForChart.length > 0 && (
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
                  {/* 키워드 점수 비교 막대 차트 */}
                  {keywordScoreData.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-foreground">
                        키워드 점수 비교
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={keywordScoreData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} />
                          <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" />
                          <YAxis 
                            tick={{ fill: 'currentColor', fontSize: 12 }} 
                            stroke="currentColor"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #ccc',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number) => value.toFixed(2)}
                          />
                          <Legend />
                          <Bar dataKey="점수" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* 키워드 비교 막대 차트 */}
                  {keywordComparisonData.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3 text-foreground">
                        키워드 비교 (검색량, CPC, 경쟁도)
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={keywordComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.2} />
                          <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} stroke="currentColor" />
                          <YAxis 
                            tick={{ fill: 'currentColor', fontSize: 12 }} 
                            stroke="currentColor"
                            yAxisId="left"
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
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
                          />
                          <Bar yAxisId="left" dataKey="검색량" fill="#10b981" radius={[8, 8, 0, 0]} />
                          <Bar yAxisId="right" dataKey="CPC" fill="#ef4444" radius={[8, 8, 0, 0]} />
                          <Bar yAxisId="right" dataKey="경쟁도" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                          <Legend />
                        </BarChart>
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

        <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            점수 계산 공식
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>점수</strong> = 검색량 ÷ (경쟁도 × CPC)
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            점수가 높을수록 효율적인 키워드입니다. 검색량이 높고, 경쟁도와 CPC가 낮을수록 좋습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

