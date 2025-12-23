import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

interface Keyword {
  keyword: string;
  searchVolume: number;
  competition: number;
  cpc: number;
  score: number;
}

interface KeywordAnalysisRequest {
  keywords: Keyword[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI 키워드 분석 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body: KeywordAnalysisRequest = await request.json();
    const { keywords } = body;

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: '분석할 키워드 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // 점수가 있는 키워드만 필터링
    const validKeywords = keywords.filter(k => k.keyword.trim() && (k.searchVolume > 0 || k.cpc > 0 || k.competition > 0));
    
    if (validKeywords.length === 0) {
      return NextResponse.json(
        { error: '분석할 수 있는 키워드 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    console.log('분석할 키워드 수:', validKeywords.length);

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

    const keywordsData = validKeywords.map(k => ({
      키워드: k.keyword,
      검색량: k.searchVolume,
      경쟁도: k.competition,
      CPC: `${k.cpc.toLocaleString('ko-KR')}원`,
      점수: k.score.toFixed(2),
    }));

    // 프롬프트 작성
    const prompt = `다음은 여러 키워드의 분석 데이터입니다. 이 데이터를 종합적으로 분석하고 인사이트를 제공해주세요.

키워드 데이터:
${JSON.stringify(keywordsData, null, 2)}

다음 항목들을 포함하여 상세한 분석을 제공해주세요:

1. **최적 키워드 선정**: 점수를 기반으로 가장 효율적인 키워드 분석
2. **키워드 그룹화**: 검색량, 경쟁도, CPC를 기준으로 키워드를 그룹화하여 분석
3. **경쟁력 분석**: 각 키워드의 경쟁력과 기회 분석
4. **예산 효율성**: CPC와 검색량을 고려한 예산 효율성 분석
5. **키워드 전략**: 키워드별 광고 전략 제안
6. **개선 제안**: 키워드 선택 및 활용 개선 방안

분석은 한국어로 작성하고, 구체적인 수치와 근거를 포함하여 설명해주세요.
분석 결과는 마크다운 형식으로 작성해주세요.`;

    console.log('Gemini API 호출 시작 - 키워드 분석');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    console.log('AI 분석 완료, 응답 길이:', analysisText.length);

    return NextResponse.json({
      success: true,
      analysis: analysisText,
    });
  } catch (error) {
    console.error('AI 키워드 분석 오류:', error);
    return NextResponse.json(
      { error: '키워드 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

