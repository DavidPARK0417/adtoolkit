import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface BreakEvenAnalysisRequest {
  productName: string;
  fixedCost: number;
  variableCost: number;
  sellingPrice: number;
  contributionMargin: number;
  breakEvenQuantity: number;
  breakEvenRevenue: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI 손익분기점 분석 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body: BreakEvenAnalysisRequest = await request.json();
    const { productName, fixedCost, variableCost, sellingPrice, contributionMargin, breakEvenQuantity, breakEvenRevenue } = body;

    if (fixedCost === 0 && variableCost === 0 && sellingPrice === 0) {
      return NextResponse.json(
        { error: '계산된 데이터가 없습니다. 먼저 계산을 수행해주세요.' },
        { status: 400 }
      );
    }

    console.log('분석 데이터:', { productName, fixedCost, variableCost, sellingPrice, contributionMargin, breakEvenQuantity, breakEvenRevenue });

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
    const prompt = `다음은 손익분기점 계산 결과입니다. 이 데이터를 종합적으로 분석하고 인사이트를 제공해주세요.

**상품 정보:**
- 상품명: ${productName || '미입력'}

**계산 결과:**
- 총 고정비: ${fixedCost.toLocaleString('ko-KR')}원
- 제품 1개당 변동비: ${variableCost.toLocaleString('ko-KR')}원
- 제품 1개당 판매가: ${sellingPrice.toLocaleString('ko-KR')}원
- 단위당 기여이익: ${contributionMargin.toLocaleString('ko-KR')}원
- 손익분기점 수량: ${breakEvenQuantity.toFixed(2)}개
- 손익분기점 매출: ${breakEvenRevenue.toLocaleString('ko-KR')}원

다음 항목들을 포함하여 상세한 분석을 제공해주세요:

1. **손익분기점 달성 가능성**: 계산된 손익분기점이 현실적으로 달성 가능한지 평가
2. **기여이익 분석**: 기여이익률이 업계 평균 대비 어떤 수준인지 분석
3. **가격 전략 평가**: 현재 판매가가 적정한지 평가
4. **비용 구조 분석**: 고정비와 변동비의 구조가 효율적인지 분석
5. **목표 달성 전략**: 손익분기점을 달성하기 위한 구체적인 전략 제안
6. **리스크 관리**: 손익분기점 미달성 시 대응 방안

분석은 한국어로 작성하고, 구체적인 수치와 근거를 포함하여 설명해주세요.
분석 결과는 마크다운 형식으로 작성해주세요.`;

    console.log('Gemini API 호출 시작 - 손익분기점 분석');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('AI 분석 완료, 응답 길이:', analysisText.length);

    return NextResponse.json({
      success: true,
      analysis: analysisText,
    });
  } catch (error) {
    console.error('AI 손익분기점 분석 오류:', error);
    return NextResponse.json(
      { error: '손익분기점 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

