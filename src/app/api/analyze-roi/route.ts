import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface ROIAnalysisRequest {
  productName: string;
  investment: number;
  revenue: number;
  cost: number;
  netProfit: number;
  roi: number;
  roas: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI ROI 분석 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body: ROIAnalysisRequest = await request.json();
    const { productName, investment, revenue, cost, netProfit, roi, roas } = body;

    if (investment === 0 && revenue === 0 && cost === 0) {
      return NextResponse.json(
        { error: '계산된 데이터가 없습니다. 먼저 계산을 수행해주세요.' },
        { status: 400 }
      );
    }

    console.log('분석 데이터:', { productName, investment, revenue, cost, netProfit, roi, roas });

    // Gemini API 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      console.log('gemini-2.5-flash 모델 사용');
    } catch {
      console.log('gemini-2.5-flash 사용 불가, gemini-2.0-flash-exp로 대체');
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      } catch {
        console.log('gemini-2.0-flash-exp 사용 불가, gemini-1.5-flash로 대체');
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      }
    }

    // 프롬프트 작성
    const prompt = `다음은 ROI(투자 대비 수익률) 계산 결과입니다. 이 데이터를 종합적으로 분석하고 인사이트를 제공해주세요.

**상품/비즈니스 정보:**
- 상품명: ${productName || '미입력'}

**계산 결과:**
- 투자금 (광고비): ${investment.toLocaleString('ko-KR')}원
- 매출: ${revenue.toLocaleString('ko-KR')}원
- 비용: ${cost.toLocaleString('ko-KR')}원
- 순이익: ${netProfit.toLocaleString('ko-KR')}원
- ROI: ${roi.toFixed(2)}%
- ROAS: ${roas.toFixed(2)}배

다음 항목들을 포함하여 상세한 분석을 제공해주세요:

1. **ROI 성과 평가**: 현재 ROI 수치가 업계 평균 대비 어떤 수준인지 평가
2. **수익성 분석**: 순이익과 ROAS를 기반으로 한 수익성 평가
3. **투자 효율성**: 투자금 대비 매출 및 순이익의 효율성 분석
4. **개선 방안**: ROI를 높이기 위한 구체적인 개선 제안
5. **비교 분석**: ROAS와 ROI의 관계를 통한 광고 전략 평가
6. **전략적 권장사항**: 향후 광고 예산 배분 및 전략에 대한 권장사항

분석은 한국어로 작성하고, 구체적인 수치와 근거를 포함하여 설명해주세요.
분석 결과는 마크다운 형식으로 작성해주세요.`;

    console.log('Gemini API 호출 시작 - ROI 분석');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('AI 분석 완료, 응답 길이:', analysisText.length);

    return NextResponse.json({
      success: true,
      analysis: analysisText,
    });
  } catch (error) {
    console.error('AI ROI 분석 오류:', error);
    return NextResponse.json(
      { error: 'ROI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

