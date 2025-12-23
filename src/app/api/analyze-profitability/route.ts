import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface ProfitabilityAnalysisRequest {
  productName: string;
  targetCPA: number;
  ltv: number;
  ratio: number;
  healthStatus: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI 수익성 진단 분석 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body: ProfitabilityAnalysisRequest = await request.json();
    const { productName, targetCPA, ltv, ratio, healthStatus } = body;

    if (targetCPA === 0 && ltv === 0 && ratio === 0) {
      return NextResponse.json(
        { error: '계산된 데이터가 없습니다. 먼저 계산을 수행해주세요.' },
        { status: 400 }
      );
    }

    console.log('분석 데이터:', { productName, targetCPA, ltv, ratio, healthStatus });

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
    const prompt = `다음은 마케팅 수익성 진단 결과입니다. 이 데이터를 종합적으로 분석하고 인사이트를 제공해주세요.

**상품 정보:**
- 상품명: ${productName || '미입력'}

**진단 결과:**
- 목표 CPA (1회 전환당 최대 광고비): ${targetCPA.toLocaleString('ko-KR')}원
- LTV (고객 생애 가치): ${ltv.toLocaleString('ko-KR')}원
- LTV:CAC 비율: ${ratio.toFixed(2)}:1
- 마케팅 건전성: ${healthStatus}

다음 항목들을 포함하여 상세한 분석을 제공해주세요:

1. **건전성 평가**: 현재 마케팅 건전성이 업계 평균 대비 어떤 수준인지 평가
2. **CPA 적정성**: 목표 CPA가 LTV 대비 적정한지 분석
3. **LTV 최적화**: LTV를 높이기 위한 구체적인 방안 제시
4. **비율 개선**: LTV:CAC 비율을 개선하기 위한 전략 제안
5. **예산 배분**: 건전성을 고려한 광고 예산 배분 전략
6. **리스크 관리**: 수익성 저하 시 대응 방안

분석은 한국어로 작성하고, 구체적인 수치와 근거를 포함하여 설명해주세요.
분석 결과는 마크다운 형식으로 작성해주세요.`;

    console.log('Gemini API 호출 시작 - 수익성 진단 분석');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('AI 분석 완료, 응답 길이:', analysisText.length);

    return NextResponse.json({
      success: true,
      analysis: analysisText,
    });
  } catch (error) {
    console.error('AI 수익성 진단 분석 오류:', error);
    return NextResponse.json(
      { error: '수익성 진단 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

