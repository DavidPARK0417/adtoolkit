import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface CROAnalysisRequest {
  monthlyVisitors: number;
  currentConversionRate: number;
  improvedConversionRate: number;
  averageOrderValue: number;
  additionalConversions: number;
  monthlyRevenueIncrease: number;
  yearlyRevenueIncrease: number;
  conversionRateImprovement: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI CRO 분석 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body: CROAnalysisRequest = await request.json();
    const {
      monthlyVisitors,
      currentConversionRate,
      improvedConversionRate,
      averageOrderValue,
      additionalConversions,
      monthlyRevenueIncrease,
      yearlyRevenueIncrease,
      conversionRateImprovement,
    } = body;

    console.log('분석 데이터:', {
      monthlyVisitors,
      currentConversionRate,
      improvedConversionRate,
      averageOrderValue,
      additionalConversions,
      monthlyRevenueIncrease,
      yearlyRevenueIncrease,
      conversionRateImprovement,
    });

    // Gemini API 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    } catch {
      console.log('gemini-2.0-flash-exp 사용 불가, gemini-1.5-flash로 대체');
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    // 프롬프트 작성
    const prompt = `다음은 전환율 최적화(CRO) 계산 결과입니다. 이 데이터를 분석하여 실용적이고 구체적인 개선 전략을 제안해주세요.

**현재 상황:**
- 월간 방문자 수: ${monthlyVisitors.toLocaleString('ko-KR')}명
- 현재 전환율: ${currentConversionRate}%
- 목표 전환율: ${improvedConversionRate}%
- 평균 주문 금액: ${averageOrderValue.toLocaleString('ko-KR')}원

**예상 개선 효과:**
- 추가 확보 전환수: ${additionalConversions.toFixed(0)}건/월
- 월간 매출 증가액: ${monthlyRevenueIncrease.toLocaleString('ko-KR')}원
- 연간 매출 증가액: ${yearlyRevenueIncrease.toLocaleString('ko-KR')}원
- 전환율 개선률: ${conversionRateImprovement > 0 ? '+' : ''}${conversionRateImprovement.toFixed(1)}%

다음 항목들을 포함하여 상세하고 실용적인 분석을 제공해주세요:

1. **현재 상황 분석**: 현재 전환율 수준과 개선 여지 평가
2. **핵심 개선 전략**: 전환율을 ${currentConversionRate}%에서 ${improvedConversionRate}%로 높이기 위한 구체적인 5가지 전략 제안
3. **A/B 테스트 아이디어**: 실제로 테스트할 수 있는 구체적인 A/B 테스트 아이디어 5가지 (테스트할 요소, 예상 효과 포함)
4. **우선순위별 액션 플랜**: 즉시 실행 가능한 단계별 액션 플랜 (1단계, 2단계, 3단계)
5. **예상 성과**: 각 전략별 예상 개선 효과와 ROI

분석은 한국어로 작성하고, 구체적이고 실행 가능한 내용으로 작성해주세요.
마크다운 형식으로 작성하되, 각 섹션은 명확하게 구분해주세요.
수치와 근거를 포함하여 설득력 있게 작성해주세요.`;

    console.log('Gemini API 호출 시작 - CRO 분석');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('AI CRO 분석 완료, 응답 길이:', analysisText.length);

    return NextResponse.json({
      success: true,
      analysis: analysisText,
    });
  } catch (error) {
    console.error('AI CRO 분석 오류:', error);
    return NextResponse.json(
      { error: 'CRO 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

