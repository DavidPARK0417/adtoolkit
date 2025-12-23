import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== AI 수익성 진단 정보 추정 요청 시작 ===');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { productName, step } = body;

    if (!productName || productName.trim() === '') {
      console.error('상품명이 제공되지 않았습니다.');
      return NextResponse.json(
        { error: '상품명을 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('상품명:', productName, '단계:', step);

    // Gemini API 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    } catch {
      console.log('gemini-2.0-flash-exp 사용 불가, gemini-1.5-flash로 대체');
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    // 단계별로 다른 프롬프트 작성
    let prompt = '';
    let expectedFields: string[] = [];

    if (step === 1) {
      // 1단계: 목표 CPA 계산기
      prompt = `다음 상품에 대한 목표 CPA 계산에 필요한 정보를 추정해주세요. 실제 시장 데이터를 기반으로 합리적인 추정치를 제공해주세요.

상품명: ${productName}

다음 정보를 JSON 형식으로만 응답해주세요 (설명 없이 JSON만):
{
  "sellingPrice": 판매가(원, 숫자만),
  "cost": 원가(원, 숫자만)
}

예시:
{
  "sellingPrice": 50000,
  "cost": 20000
}

응답은 JSON 형식만 제공하고, 다른 설명은 포함하지 마세요.`;
      expectedFields = ['sellingPrice', 'cost'];
    } else if (step === 2) {
      // 2단계: LTV 계산기
      prompt = `다음 상품에 대한 LTV 계산에 필요한 정보를 추정해주세요. 실제 시장 데이터를 기반으로 합리적인 추정치를 제공해주세요.

상품명: ${productName}

다음 정보를 JSON 형식으로만 응답해주세요 (설명 없이 JSON만):
{
  "orderAmount": 주문액(평균 주문 금액, 원, 숫자만),
  "purchaseFrequency": 구매 빈도(고객당 평균 구매 횟수, 숫자만)
}

예시:
{
  "orderAmount": 50000,
  "purchaseFrequency": 3
}

응답은 JSON 형식만 제공하고, 다른 설명은 포함하지 마세요.`;
      expectedFields = ['orderAmount', 'purchaseFrequency'];
    } else if (step === 3) {
      // 3단계: LTV:CAC 비율 계산기
      prompt = `다음 상품에 대한 LTV:CAC 비율 계산에 필요한 정보를 추정해주세요. 실제 시장 데이터를 기반으로 합리적인 추정치를 제공해주세요.

상품명: ${productName}

다음 정보를 JSON 형식으로만 응답해주세요 (설명 없이 JSON만):
{
  "ltv": LTV(고객 생애 가치, 원, 숫자만),
  "cac": CAC(고객 획득 비용, 원, 숫자만)
}

예시:
{
  "ltv": 150000,
  "cac": 50000
}

응답은 JSON 형식만 제공하고, 다른 설명은 포함하지 마세요.`;
      expectedFields = ['ltv', 'cac'];
    } else {
      return NextResponse.json(
        { error: '올바른 단계를 지정해주세요 (1, 2, 또는 3).' },
        { status: 400 }
      );
    }

    console.log('Gemini API 호출 시작');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini API 응답:', text);

    // JSON 파싱 시도
    let profitabilityData;
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      profitabilityData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('원본 응답:', text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          profitabilityData = JSON.parse(jsonMatch[0]);
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
    const isValid = expectedFields.every(field => typeof profitabilityData[field] === 'number');
    if (!isValid) {
      console.error('응답 데이터 형식 오류:', profitabilityData);
      return NextResponse.json(
        { error: 'AI 응답 데이터 형식이 올바르지 않습니다.' },
        { status: 500 }
      );
    }

    console.log('수익성 진단 정보 추정 완료:', profitabilityData);
    
    // 반환 데이터 정리
    const responseData: Record<string, number> = {};
    expectedFields.forEach(field => {
      responseData[field] = Math.round(profitabilityData[field]);
    });
    
    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('AI 수익성 진단 정보 추정 오류:', error);
    return NextResponse.json(
      { error: '수익성 진단 정보 추정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

