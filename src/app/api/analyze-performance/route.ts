import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface Product {
  id: string;
  name: string;
  price: number;
  profitPerUnit: number;
  adCost: number;
  conversions: number;
}

interface CalculatedResult {
  revenue: number;
  roas: number;
  roi: number;
  netProfit: number;
}

interface AnalysisRequest {
  products: Product[];
  results: Record<string, CalculatedResult>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI 광고 성과 분석 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body: AnalysisRequest = await request.json();
    const { products, results } = body;

    if (!products || products.length === 0) {
      console.error('분석할 상품 데이터가 없습니다.');
      return NextResponse.json(
        { error: '분석할 상품 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    console.log('분석할 상품 수:', products.length);

    // 데이터를 분석하기 쉬운 형식으로 변환
    const analysisData = products.map((product) => {
      const result = results[product.id];
      return {
        상품명: product.name,
        판매가: product.price,
        개당순이익: product.profitPerUnit,
        광고비: product.adCost,
        전환수: product.conversions,
        매출: result?.revenue || 0,
        ROAS: result?.roas || 0,
        ROI: result?.roi || 0,
        순이익: result?.netProfit || 0,
      };
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
    const prompt = `다음은 여러 상품의 광고 성과 데이터입니다. 이 데이터를 종합적으로 분석하고 인사이트를 제공해주세요.

상품 데이터:
${JSON.stringify(analysisData, null, 2)}

다음 항목들을 포함하여 상세한 분석을 제공해주세요:

1. **전체 성과 요약**: 전체적인 광고 성과를 한눈에 파악할 수 있도록 요약
2. **최고 성과 상품 분석**: 가장 좋은 성과를 낸 상품의 특징과 강점 분석
3. **개선이 필요한 상품**: 성과가 낮은 상품의 문제점과 개선 방안 제시
4. **비교 분석**: 상품들 간의 차이점과 패턴 분석
5. **구체적인 개선 제안**: 각 상품별로 구체적인 개선 방안 제시 (광고비 조정, 전환율 개선 등)
6. **전략적 권장사항**: 전체적인 광고 전략에 대한 권장사항

분석은 한국어로 작성하고, 구체적인 수치와 근거를 포함하여 설명해주세요.
분석 결과는 마크다운 형식으로 작성해주세요.`;

    console.log('Gemini API 호출 시작 - 광고 성과 분석');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('AI 분석 완료, 응답 길이:', analysisText.length);

    return NextResponse.json({
      success: true,
      analysis: analysisText,
    });
  } catch (error) {
    console.error('AI 광고 성과 분석 오류:', error);
    return NextResponse.json(
      { error: '광고 성과 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

