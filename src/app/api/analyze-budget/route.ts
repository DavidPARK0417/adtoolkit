import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface BudgetAnalysisRequest {
  productName: string;
  targetConversions: number;
  cpc: number;
  conversionRate: number;
  requiredClicks: number;
  requiredBudget: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI 광고 예산 분석 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body: BudgetAnalysisRequest = await request.json();
    const { productName, targetConversions, cpc, conversionRate, requiredClicks, requiredBudget } = body;

    if (targetConversions === 0 && cpc === 0 && conversionRate === 0) {
      return NextResponse.json(
        { error: '계산된 데이터가 없습니다. 먼저 계산을 수행해주세요.' },
        { status: 400 }
      );
    }

    console.log('분석 데이터:', { productName, targetConversions, cpc, conversionRate, requiredClicks, requiredBudget });

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
    const prompt = `다음은 광고 예산 계산 결과입니다. 이 데이터를 종합적으로 분석하고 인사이트를 제공해주세요.

**상품/목표 정보:**
- 상품명: ${productName || '미입력'}

**계산 결과:**
- 목표 전환수: ${targetConversions.toLocaleString('ko-KR')}건
- CPC (클릭당 비용): ${cpc.toLocaleString('ko-KR')}원
- 전환율: ${conversionRate.toFixed(2)}%
- 필요한 클릭수: ${Math.ceil(requiredClicks).toLocaleString('ko-KR')}회
- 필요한 예산: ${Math.ceil(requiredBudget).toLocaleString('ko-KR')}원

다음 항목들을 포함하여 상세한 분석을 제공해주세요:

1. **예산 적정성 평가**: 계산된 예산이 업계 평균 대비 적정한지 평가
2. **CPC 분석**: 현재 CPC가 경쟁력 있는 수준인지 분석
3. **전환율 평가**: 전환율이 업계 평균 대비 어떤 수준인지 평가
4. **예산 최적화 방안**: 예산을 효율적으로 사용하기 위한 구체적인 제안
5. **리스크 분석**: 예산 집행 시 예상되는 리스크와 대응 방안
6. **단계별 예산 배분**: 예산을 단계적으로 배분하는 전략 제안

분석은 한국어로 작성하고, 구체적인 수치와 근거를 포함하여 설명해주세요.
분석 결과는 마크다운 형식으로 작성해주세요.`;

    console.log('Gemini API 호출 시작 - 광고 예산 분석');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('AI 분석 완료, 응답 길이:', analysisText.length);

    return NextResponse.json({
      success: true,
      analysis: analysisText,
    });
  } catch (error) {
    console.error('AI 광고 예산 분석 오류:', error);
    return NextResponse.json(
      { error: '광고 예산 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

