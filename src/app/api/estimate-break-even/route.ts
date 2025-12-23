import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI 손익분기점 정보 추정 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { productName } = body;

    if (!productName || productName.trim() === '') {
      console.error('상품명이 제공되지 않았습니다.');
      return NextResponse.json(
        { error: '상품명을 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('상품명:', productName);

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
    const prompt = `다음 상품에 대한 손익분기점 계산에 필요한 정보를 추정해주세요. 실제 시장 데이터를 기반으로 합리적인 추정치를 제공해주세요.

상품명: ${productName}

다음 정보를 JSON 형식으로만 응답해주세요 (설명 없이 JSON만):
{
  "fixedCost": 총 고정비(월세, 인건비 등, 원, 숫자만),
  "variableCost": 제품 1개당 변동비(원가 등, 원, 숫자만),
  "sellingPrice": 제품 1개당 판매가(원, 숫자만)
}

예시:
{
  "fixedCost": 5000000,
  "variableCost": 10000,
  "sellingPrice": 30000
}

응답은 JSON 형식만 제공하고, 다른 설명은 포함하지 마세요.`;

    console.log('Gemini API 호출 시작');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini API 응답:', text);

    // JSON 파싱 시도
    let breakEvenData;
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      breakEvenData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('원본 응답:', text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          breakEvenData = JSON.parse(jsonMatch[0]);
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
      typeof breakEvenData.fixedCost !== 'number' ||
      typeof breakEvenData.variableCost !== 'number' ||
      typeof breakEvenData.sellingPrice !== 'number'
    ) {
      console.error('응답 데이터 형식 오류:', breakEvenData);
      return NextResponse.json(
        { error: 'AI 응답 데이터 형식이 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    console.log('손익분기점 정보 추정 완료:', breakEvenData);
    
    return NextResponse.json({
      success: true,
      data: {
        fixedCost: Math.round(breakEvenData.fixedCost),
        variableCost: Math.round(breakEvenData.variableCost),
        sellingPrice: Math.round(breakEvenData.sellingPrice),
      },
    });
  } catch (error) {
    console.error('AI 손익분기점 정보 추정 오류:', error);
    return NextResponse.json(
      { error: '손익분기점 정보 추정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

