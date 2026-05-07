import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 네이버 블로그용 영구 이미지 업로드 API
 *
 * 동작 방식:
 *  1. 클라이언트가 이미지 URL을 전달
 *  2. 서버에서 이미지를 fetch (CORS/Referer 우회)
 *  3. Supabase Storage(product-images 버킷)에 업로드
 *  4. 영구 공개 URL 반환
 *
 * 이 URL은 만료되지 않으므로 네이버 블로그에 붙여넣어도 이미지가 영구적으로 표시됨
 */
export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "imageUrl이 필요합니다" },
        { status: 400 },
      );
    }

    // Supabase 클라이언트 초기화 (서버사이드)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 외부 이미지 서버사이드에서 fetch (CORS, Referer 우회)
    const isNotionS3 =
      imageUrl.includes("amazonaws.com") || imageUrl.includes("notion.so");

    const fetchHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
    };

    if (isNotionS3) {
      fetchHeaders["Referer"] = "https://www.notion.so/";
    }

    const imageResponse = await fetch(imageUrl, {
      headers: fetchHeaders,
      redirect: "follow",
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `이미지 fetch 실패: ${imageResponse.status}` },
        { status: 502 },
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    let contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // avif/webp → jpeg 변환 (호환성)
    if (contentType.includes("avif") || contentType.includes("webp")) {
      contentType = "image/jpeg";
    }

    // 확장자 결정
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("gif")
        ? "gif"
        : "jpg";

    // 파일명: 타임스탬프 + 랜덤 suffix로 중복 방지
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `naver-blog/${timestamp}-${random}.${ext}`;

    // Supabase Storage 업로드 (product-images 버킷: public)
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: false,
        cacheControl: "31536000", // 1년 캐시
      });

    if (uploadError) {
      console.error("[upload-naver-image] 업로드 실패:", uploadError);
      return NextResponse.json(
        { error: `Supabase 업로드 실패: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // 영구 공개 URL 생성
    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    if (!publicUrlData?.publicUrl) {
      return NextResponse.json(
        { error: "공개 URL 생성 실패" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      permanentUrl: publicUrlData.publicUrl,
    });
  } catch (error) {
    console.error("[upload-naver-image] 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
