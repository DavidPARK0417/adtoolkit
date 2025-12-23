import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI 키워드 정보 추정 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { keyword } = body;

    if (!keyword || keyword.trim() === '') {
      console.error('키워드가 제공되지 않았습니다.');
      return NextResponse.json(
        { error: '키워드를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('키워드:', keyword);

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
    const prompt = `다음 키워드에 대한 마케팅 정보를 추정해주세요. 실제 시장 데이터를 기반으로 합리적인 추정치를 제공해주세요.

키워드: ${keyword}

다음 정보를 JSON 형식으로만 응답해주세요 (설명 없이 JSON만):
{
  "searchVolume": 월간 검색량(숫자만),
  "competition": 경쟁도(1-10 사이의 숫자만),
  "cpc": 클릭당 비용(원, 숫자만)
}

예시:
{
  "searchVolume": 10000,
  "competition": 7,
  "cpc": 500
}

응답은 JSON 형식만 제공하고, 다른 설명은 포함하지 마세요.`;

    console.log('Gemini API 호출 시작');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini API 응답:', text);

    // JSON 파싱 시도
    let keywordData;
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      keywordData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('원본 응답:', text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          keywordData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('JSON 추출 후 파싱 실패:', e);
          return NextResponse.json(
            { error: 'AI 응답을 파싱할 수 없습니다.' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'AI 응답 형식이 올바르지 않습니다.' },
          { status: 500 }
        );
      }
    }

    // 데이터 검증
    if (
      typeof keywordData.searchVolume !== 'number' ||
      typeof keywordData.competition !== 'number' ||
      typeof keywordData.cpc !== 'number'
    ) {
      console.error('응답 데이터 형식 오류:', keywordData);
      return NextResponse.json(
        { error: 'AI 응답 데이터 형식이 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    // 경쟁도 범위 검증 (1-10)
    if (keywordData.competition < 1 || keywordData.competition > 10) {
      keywordData.competition = Math.max(1, Math.min(10, keywordData.competition));
    }

    console.log('키워드 정보 추정 완료:', keywordData);
    
    return NextResponse.json({
      success: true,
      data: {
        searchVolume: Math.round(keywordData.searchVolume),
        competition: Math.round(keywordData.competition),
        cpc: Math.round(keywordData.cpc),
      },
    });
  } catch (error) {
    console.error('AI 키워드 정보 추정 오류:', error);
    return NextResponse.json(
      { error: '키워드 정보 추정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

