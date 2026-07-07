"use client";

import React from "react";
import { Copy, Check, FileText, Hash, AtSign } from "lucide-react";

interface TagCopySectionProps {
  title: string;
  tags: string[];
  contentRef?: React.RefObject<HTMLDivElement | null>;
  descriptionRef?: React.RefObject<HTMLDivElement | null>;
  onlyButtons?: boolean;
  onlyTags?: boolean;
  className?: string;
  type?: "menu" | "insight";
  category?: string;
  cookingTime?: string | number;
  products?: string[];
}

export default function TagCopySection({
  title,
  tags,
  contentRef,
  descriptionRef,
  onlyButtons = false,
  onlyTags = false,
  className = "",
  type = "menu",
  category = "",
  cookingTime,
  products = [],
}: TagCopySectionProps) {
  const [activeButton, setActiveButton] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const isProcessingRef = React.useRef(false); // 가공/복사 중복 방지용

  // tags가 단일 문자열 "AI, 인공지능, 테크" 형태 등으로 들어올 수 있기 때문에,
  // 이를 쉼표(,)나 공백( ) 기준으로 다시 쪼개어 각각의 태그 배열로 가공합니다.
  const processedTags = React.useMemo(() => {
    if (!tags || tags.length === 0) return [];

    let result: string[] = [];
    tags.forEach((tag) => {
      if (!tag) return;

      // 쉼표가 포함되어 있으면 쉼표 기준으로 분할
      if (tag.includes(",")) {
        result.push(
          ...tag
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        );
      }
      // 공백이 포함되어 있고, '#'로 시작하지 않는 경우 (예: "AI 테크 트렌드") 공백 기준으로 분할
      else if (tag.includes(" ") && !tag.trim().startsWith("#")) {
        result.push(
          ...tag
            .split(/\s+/)
            .map((t) => t.trim())
            .filter(Boolean),
        );
      }
      // 그 외에는 단순 추가
      else {
        result.push(tag.trim());
      }
    });

    // 태그 앞의 # 기호가 있으면 제거하여 표준화 (렌더링 및 복사 시 유연하게 # 붙일 수 있도록)
    return result
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag.substring(1) : tag));
  }, [tags]);

  // ⭐ 같은 메뉴에서 공통으로 쓸 “랜덤 카피 제목” 저장용 상태
  const [menuDynamicTitle, setMenuDynamicTitle] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // ⭐ 제목 패턴 생성 함수 (SEO + CTR 최적화)
  const generateDynamicTitle = React.useCallback(
    (rawTitle: string, time?: string | number) => {
      if (!rawTitle) return "";

      const title = rawTitle.trim();
      const bracketTitle = `[${title}]`;
      const quoteTitle = `"${title}"`;

      // cookingTime 파싱 (예: "3", "3분", 3 -> "3분")
      let timeValueStr = "5분";
      if (time) {
        const timeStr = time.toString().trim();
        timeValueStr = timeStr.includes("분") ? timeStr : `${timeStr}분`;
      }

      // 혹시 '3분분' 이런식으로 되지 않게
      timeValueStr = timeValueStr.replace(/분분/g, "분");

      const patterns = [
        // ⭐ 기본 SEO 패턴
        `${title} 레시피`,
        `${title} 만드는 법`,
        `${title} 황금 레시피`,
        `${title} 초간단 레시피`,
        `집에서 쉽게 만드는 ${title} 레시피`,

        // ⭐ 실패 없는 패턴
        `실패 없는 ${title} 황금 레시피`,
        `요리 초보도 성공하는 ${title} 레시피`,
        `이대로만 만들면 성공하는 ${title} 레시피`,
        `${title} 맛있게 만드는 방법`,
        `${title} 이렇게 만들면 더 맛있습니다`,

        // ⭐ 오늘 메뉴 패턴 (티스토리 트래픽 핵심)
        `오늘 뭐 먹지? ${title} 어떠세요`,
        `오늘의 메뉴 추천 ${title}`,
        `오늘 메뉴 고민 끝! ${title} 레시피`,
        `오늘 한 끼 추천 ${title}`,

        // ⭐ 감정 클릭 유도 패턴
        `한 번 먹으면 계속 찾는 ${title} 레시피`,
        `식당보다 맛있는 ${title} 레시피`,
        `집에서 만드는 맛집 ${title}`,
        `정말 맛있는 ${title} 레시피`,
        `요즘 인기 메뉴 ${title} 레시피`,

        // ⭐ 숫자 CTR 패턴
        `${timeValueStr} 완성 ${title} 초간단 레시피`,
        `${timeValueStr} 만에 만드는 ${title}`,
        `초간단 ${title} 레시피 ${timeValueStr} 완성`,
        `누구나 만드는 ${title} 간단 레시피`,

        // ⭐ 괄호 패턴
        `오늘의 메뉴 : ${bracketTitle}`,
        `오늘의 메뉴 : ${quoteTitle}`,
        `실패 없는 요리 레시피 : ${bracketTitle}`,
        `실패 없는 요리 레시피 : ${quoteTitle}`,

        // ⭐ 추가 CTR 패턴
        `${title} 레시피, 이렇게 만들면 성공`,
        `${title} 제대로 만드는 방법`,
        `${title} 맛있게 만드는 황금 비율`,
      ];

      const randomIndex = Math.floor(Math.random() * patterns.length);
      return patterns[randomIndex];
    },
    [],
  );

  // ⭐ 메뉴 페이지일 때, 처음 렌더링 시 한 번만 랜덤 카피 제목 생성
  React.useEffect(() => {
    if (type === "menu" && title && !menuDynamicTitle) {
      const generated = generateDynamicTitle(title, cookingTime);
      setMenuDynamicTitle(generated || title);
    }
  }, [type, title, menuDynamicTitle, cookingTime, generateDynamicTitle]);

  const copyToClipboard = async (
    content: string | ClipboardItem[],
    buttonId: string,
  ) => {
    try {
      if (Array.isArray(content)) {
        // ClipboardItem 배열인 경우 (복합 컨텐츠)
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write(content);
        } else {
          throw new Error("ClipboardItem not supported");
        }
      } else {
        // 단일 문자열인 경우 (기존 로직 유지)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(content);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = content;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          textarea.style.top = "0";
          textarea.style.fontSize = "12pt";
          textarea.setAttribute("readonly", "");
          document.body.appendChild(textarea);

          const isiOS = navigator.userAgent.match(/ipad|iphone/i);
          if (isiOS) {
            const range = document.createRange();
            range.selectNodeContents(textarea);
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
            textarea.setSelectionRange(0, 999999);
          } else {
            textarea.select();
          }

          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
      }

      setActiveButton(buttonId);
      window.setTimeout(() => setActiveButton(null), 2000);
    } catch (err) {
      console.error("복사 실패:", err);
      setActiveButton(null);
    }
  };

  // 제목 복사
  const handleCopyTitle = () => {
    if (!title) return;
    // 기본값: 원래 제목
    let textToCopy = title;
    // ✅ 오늘의 메뉴 상세페이지(type === "menu")에서만 상태에 저장된 랜덤 카피 적용
    if (type === "menu") {
      textToCopy = menuDynamicTitle || title;
    }
    void copyToClipboard(textToCopy, "title");
  };

  // 태그1: # 없이 쉼표로 구분
  const handleCopyTag1 = () => {
    if (processedTags.length === 0) return;
    const copyText = processedTags.join(", ");
    void copyToClipboard(copyText, "tag1");
  };

  // 태그2: # 포함, 공백으로 구분
  const handleCopyTag2 = () => {
    if (processedTags.length === 0) return;
    const copyText = processedTags.map((tag) => `#${tag}`).join(" ");
    void copyToClipboard(copyText, "tag2");
  };

  // 본문 HTML 복사 (티스토리 블로그용 - 네이버N과 동일한 디자인 적용)
  const handleCopyHtmlT = async () => {
    if (!contentRef?.current || !descriptionRef?.current) return;

    let plainTextCombined = "";

    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";

      // 1. 요약 박스 (네이버N과 동일한 스타일 - 글자색 검은색으로 변경)
      const summaryText = descriptionRef.current.innerText;
      const summaryHtml = `
        <div style="margin: 20px 0; padding: 25px 30px; border-left: 5px solid #14b8a6; background-color: #f0fdfa; border-radius: 0 10px 10px 0; text-align: left;">
          <h3 data-ke-size="size18" style="color: #065f46; line-height: 1.8; margin: 0; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif; letter-spacing: -0.5px; font-weight: bold;">
            ${summaryText}
          </h3>
        </div>
      `;

      // 2. 본문 내용 가공 (Dom Clone을 이용한 이미지 데이터 객체화)
      const contentClone = contentRef.current.cloneNode(true) as HTMLDivElement;

      // 사용자 요청: 보이지 않는 canvas 엘리먼트를 생성해서 이미지를 그린 뒤,
      // canvas.toDataURL('image/jpeg')를 통해 표준 JPEG 데이터로 뽑아서 복사
      let clipboardImageBlob: Blob | null = null;
      const images = Array.from(contentClone.querySelectorAll("img"));

      for (const img of images) {
        // [기능 1] Lazy Load(지연 로딩) 기능 해제
        img.removeAttribute("loading");
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.removeAttribute("decoding");

        const srcUrl = img.getAttribute("src");
        if (!srcUrl) continue;

        // 원본이 외부 이미지거나 프록시를 통하는 경우, 직접 Canvas에 그리기 위해 프록시 URL 사용
        let proxyUrl = srcUrl;
        if (srcUrl.startsWith("http")) {
          if (!srcUrl.includes("/api/proxy-image")) {
            proxyUrl = `/api/proxy-image?url=${encodeURIComponent(srcUrl)}`;
          }
        } else if (srcUrl.startsWith("/")) {
          proxyUrl = srcUrl;
        }

        try {
          const imgObj = new window.Image();
          imgObj.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            imgObj.onload = resolve;
            imgObj.onerror = reject;
            imgObj.src = proxyUrl;
          });

          const MAX_WIDTH = 800;
          let targetWidth = imgObj.naturalWidth || imgObj.width;
          let targetHeight = imgObj.naturalHeight || imgObj.height;

          // 너비가 800px보다 크면 비율에 맞춰 축소
          if (targetWidth > MAX_WIDTH) {
            targetHeight = (targetHeight * MAX_WIDTH) / targetWidth;
            targetWidth = MAX_WIDTH;
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            // 이미지 부드럽게 리사이징되도록 설정
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // 투명 배경이 검게 변하는 것을 방지 (JPEG 변환용 흰색 배경)
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imgObj, 0, 0, targetWidth, targetHeight);

            // 티스토리 호환 JPEG Base64 치환 (품질 0.75로 낮추어 용량 압축)
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
            img.setAttribute("src", dataUrl);

            // 첫 번째 이미지는 클립보드 Mime(객체) 복사용 Blob으로 추출
            if (!clipboardImageBlob) {
              clipboardImageBlob = await new Promise<Blob | null>((res) => {
                // 클립보드 API는 image/png 만 허용할 경우가 많으므로 png 반환
                canvas.toBlob((blob) => res(blob), "image/png");
              });
            }
          }
        } catch (err) {
          console.error("Canvas 이미지 변환 실패:", err);
          // 실패 시 최후의 수단: 원본 도메인 절대 경로 치환 + jpg 확장자 눈속임
          let originalUrl = srcUrl;
          if (srcUrl.includes("/api/proxy-image")) {
            const urlMatch = srcUrl.match(/url=([^&]+)/);
            if (urlMatch) {
              originalUrl = decodeURIComponent(urlMatch[1]);
            }
          }
          originalUrl = originalUrl.replace(/\.(avif|webp)(?=\?|$)/i, ".jpg");
          img.setAttribute(
            "src",
            originalUrl.startsWith("http")
              ? originalUrl
              : baseUrl + originalUrl,
          );
        }
      }

      // 테이블 스타일링 (클론 DOM 조작)
      const tables = Array.from(contentClone.querySelectorAll("table"));
      for (const table of tables) {
        table.setAttribute(
          "style",
          "width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 16px; text-align: left; border: 1px solid #d1d5db; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;",
        );

        const ths = Array.from(table.querySelectorAll("th"));
        for (const th of ths) {
          th.setAttribute(
            "style",
            "padding: 12px 15px; font-weight: bold; text-align: center; border: 1px solid #d1d5db; color: #111827; background-color: #ecfdf5;",
          );
        }

        const trs = Array.from(table.querySelectorAll("tr"));
        for (const tr of trs) {
          tr.setAttribute("style", "border-bottom: 1px solid #d1d5db;");

          const tds = Array.from(tr.querySelectorAll("td"));
          if (tds.length > 0) {
            // 첫 번째 td에 에메랄드 음영 적용
            tds[0].setAttribute(
              "style",
              "padding: 12px 15px; border: 1px solid #d1d5db; color: #374151; background-color: #ecfdf5; font-weight: 500;",
            );
            // 나머지 td
            for (let i = 1; i < tds.length; i++) {
              tds[i].setAttribute(
                "style",
                "padding: 12px 15px; border: 1px solid #d1d5db; color: #374151;",
              );
            }
          }
        }
      }

      let bodyHtml = contentClone.innerHTML;

      // 티스토리/네이버 등 일부 에디터에서 첫 행(th, thead)이 올바르게 렌더링되지 않거나 무시되는 현상을 방지하기 위해 일반 td와 tbody로 강제 변환
      bodyHtml = bodyHtml
        .replace(/<thead/gi, "<tbody")
        .replace(/<\/thead>/gi, "</tbody>");
      bodyHtml = bodyHtml.replace(/<th/gi, "<td").replace(/<\/th>/gi, "</td>");

      // 제목 스타일 처리
      const h1Style =
        "color: #059669; font-size: 24px; font-weight: bold; margin: 40px 0 20px 0; line-height: 1.4; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;";
      bodyHtml = bodyHtml.replace(
        /<h1[^>]*>(.*?)<\/h1>/gi,
        `<h1 style="${h1Style}">$1</h1>`,
      );

      const h2Style =
        "color: #059669; font-size: 22px; font-weight: bold; margin: 35px 0 15px 0; line-height: 1.4; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;";
      bodyHtml = bodyHtml.replace(
        /<h2[^>]*>(.*?)<\/h2>/gi,
        (match, content) => {
          // 레시피 정보(이모지 포함)인 경우 검은색(#000000) 적용 및 간격 축소
          const isRecipeInfo = content.match(/[🍽️👥🔥⭐⏱️]/);
          if (isRecipeInfo) {
            const recipeStyle = h2Style
              .replace("color: #059669;", "color: #000000;")
              .replace("margin: 35px 0 15px 0;", "margin: 5px 0;");
            return `<h2 style="${recipeStyle}">${content}</h2>`;
          }
          return `<br /><h2 style="${h2Style}">${content}</h2>`;
        },
      );

      const h3Style =
        "color: #059669; font-size: 20px; font-weight: bold; margin: 35px 0 15px 0; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;";
      bodyHtml = bodyHtml.replace(
        /<h3[^>]*>(.*?)<\/h3>/gi,
        (match, content) => {
          // 레시피 정보(이모지 포함)인 경우 검은색(#000000) 적용 및 간격 축소
          const isRecipeInfo = content.match(/[🍽️👥🔥⭐⏱️]/);
          if (isRecipeInfo) {
            const recipeStyle = h3Style
              .replace("color: #059669;", "color: #000000;")
              .replace("margin: 35px 0 15px 0;", "margin: 5px 0;");
            return `<h3 style="${recipeStyle}">${content}</h3>`;
          }
          return `<br /><h3 style="${h3Style}">${content}</h3>`;
        },
      );

      // 특정 중요 헤더 텍스트 스타일링
      const specialHeaders = [
        "📋 요리 정보 (Cooking Info)",
        "🛒 오늘의 재료 (Today's Ingredients)",
        "🍳 요리 가이드 (Cooking Guide)",
      ];

      specialHeaders.forEach((header) => {
        const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const reg = new RegExp(escaped, "g");
        const needsExtraSpace =
          header.includes("오늘의 재료") || header.includes("요리 가이드");
        const prefix = needsExtraSpace ? "<br />" : "";
        // 하단 마진을 5px로 줄여 내용과 밀착시킴
        bodyHtml = bodyHtml.replace(
          reg,
          `${prefix}<h1 data-ke-size="size32" style="color: #059669; font-size: 30px; font-weight: bold; margin: 20px 0 5px 0;">${header}</h1>`,
        );
      });

      // 단락 p 스타일
      const pStyle =
        "color: #333333; font-size: 17px; line-height: 1.9; margin: 15px 0; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif; word-break: break-all;";
      bodyHtml = bodyHtml.replace(
        /<p([^>]*)>(.*?)<\/p>/gi,
        (match, attr, content) => {
          if (attr.includes("text-center")) {
            return `<p style="${pStyle.replace("color: #333333;", "color: #888888;").replace("font-size: 17px;", "font-size: 15px;")} text-align: center; font-style: italic;">${content}</p>`;
          }
          // 레시피 정보(이모지 포함)인 경우 검은색(#000000) 적용 및 간격 축소
          const isRecipeInfo = content.match(/[🍽️👥🔥⭐⏱️]/);
          const finalPStyle = isRecipeInfo
            ? pStyle
                .replace("color: #333333;", "color: #000000;")
                .replace("margin: 15px 0;", "margin: 2px 0;")
            : pStyle;
          return `<p style="${finalPStyle}">${content}</p>`;
        },
      );

      // 이미지 스타일
      bodyHtml = bodyHtml.replace(
        /<img([^>]+)>/gi,
        '<div style="text-align: center; margin: 40px 0;"><img $1 style="max-width: 100%; height: auto; border-radius: 8px;"></div>',
      );

      // 리스트 스타일
      const listStyle =
        "color: #333333; font-size: 17px; line-height: 1.8; margin: 15px 0; padding-left: 20px; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;";
      bodyHtml = bodyHtml.replace(/<ul[^>]*>/gi, `<ul style="${listStyle}">`);
      bodyHtml = bodyHtml.replace(/<ol[^>]*>/gi, `<ol style="${listStyle}">`);
      bodyHtml = bodyHtml.replace(
        /<li[^>]*>/gi,
        "<li style='margin-bottom: 8px;'>",
      );

      // 강조 및 인용구
      bodyHtml = bodyHtml.replace(
        /<strong[^>]*>/gi,
        "<strong style='color: #000000; font-weight: bold;'>",
      );
      const bqStyle =
        "border-left: 4px solid #d1d5db; padding: 15px 25px; margin: 30px 0; background-color: #f9fafb; color: #666666; font-size: 16px; italic;";
      bodyHtml = bodyHtml.replace(
        /<blockquote[^>]*>/gi,
        `<blockquote style="${bqStyle}">`,
      );

      // [최종 처리 1] 오늘의 재료 섹션 스타일링
      const ingredientsSectionPattern =
        /(🛒 오늘의 재료 \(Today's Ingredients\)<\/h1>)([\s\S]*?)(<br \/><h1[^>]*>🍳 요리 가이드 \(Cooking Guide\))/gi;

      bodyHtml = bodyHtml.replace(
        ingredientsSectionPattern,
        (_match: string, header1: string, content: string, header2: string) => {
          // 섹션 내부의 모든 불필요한 빈 줄(<br />) 제거
          const cleanedContent = content.replace(/<br\s*\/?>/gi, "").trim();

          let isFirst = true;
          const styledContent = cleanedContent.replace(
            /<([a-z1-6]+)([^>]*)>([\s\S]*?)<\/\1>/gi,
            (
              _tagMatch: string,
              tagName: string,
              _attributes: string,
              innerText: string,
            ) => {
              if (
                tagName.toLowerCase() === "img" ||
                tagName.toLowerCase() === "br" ||
                innerText.trim() === ""
              )
                return _tagMatch;

              // 첫 번째 항목은 상단 마진을 제거하여 제목과 밀착
              const marginTop = isFirst ? "0px" : "10px";
              isFirst = false;

              // 제목(23px) 스타일 적용
              return `<h2 data-ke-size="size23" style="color: #000000 !important; font-size: 23px !important; font-weight: bold !important; line-height: 1.8 !important; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif !important; margin: ${marginTop} 0 10px 0;">${innerText}</h2>`;
            },
          );
          // div에 margin-top: 0 추가하여 제목과 밀착
          return `${header1}<div style="color: #000000; line-height: 1.8; margin-top: 0;">${styledContent}</div>${header2}`;
        },
      );

      // [최종 처리 2] 요리 가이드 섹션 스타일링
      const cookingGuideParts = bodyHtml.split(
        /<h1[^>]*>🍳 요리 가이드 \(Cooking Guide\)<\/h1>/i,
      );
      if (cookingGuideParts.length > 1) {
        const headerPart =
          cookingGuideParts[0] +
          '<h1 data-ke-size="size32" style="color: #059669; font-size: 30px; font-weight: bold; margin: 20px 0;">🍳 요리 가이드 (Cooking Guide)</h1>';
        let remainingContent = cookingGuideParts
          .slice(1)
          .join(
            '<h1 data-ke-size="size32" style="color: #059669; font-size: 30px; font-weight: bold; margin: 20px 0;">🍳 요리 가이드 (Cooking Guide)</h1>',
          );

        // 1. 모든 태그에 기본 스타일 적용 (리스트 포함)
        remainingContent = remainingContent.replace(
          /<([a-z1-6]+)([^>]*)>([\s\S]*?)<\/\1>/gi,
          (
            _tagMatch: string,
            tagName: string,
            attributes: string,
            innerContent: string,
          ) => {
            const lowerTag = tagName.toLowerCase();
            if (lowerTag === "img" || lowerTag === "br") return _tagMatch;

            // 모든 태그에 대해 20px 적용
            const fontSize = "20px";
            const keSize = "size20";

            // 사용자가 요청한 리스트 아이템 스타일 최우선 적용
            const baseStyle = `font-size: ${fontSize} !important; line-height: 1.8 !important; color: #333333 !important; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif !important;`;

            if (attributes.includes("style=")) {
              return `<${tagName}${attributes.replace(/style="[^"]*"/, `style="${baseStyle}"`)} data-ke-size="${keSize}">${innerContent}</${tagName}>`;
            } else {
              return `<${tagName}${attributes} style="${baseStyle}" data-ke-size="${keSize}">${innerContent}</${tagName}>`;
            }
          },
        );

        remainingContent = remainingContent.replace(
          /(>|^|\s)(\d+\.)(\s)/g,
          (_match, prefix, num, suffix) => {
            return `${prefix}<span style="color: #888888 !important; font-size: 24px !important; font-weight: bold !important; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif !important;">${num}</span>${suffix}`;
          },
        );

        // 티스토리 전용 구조 적용 (div 래핑 및 style 태그 포함)
        const tistoryStyle = `
<style>
.tistory-cooking-guide ol li {
  font-size: 19px !important;
  line-height: 1.8 !important;
}
</style>
        `.trim();

        bodyHtml =
          headerPart +
          tistoryStyle +
          `\n<div class="tistory-cooking-guide">\n${remainingContent}\n</div>`;
      }

      let disclaimerHtml = "";
      let disclaimerText = "";

      if (products && products.length > 0) {
        disclaimerHtml = `<div style="text-align: center; margin-bottom: 20px;" align="center"><span style="color: #ff9800;"><i>"이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."</i></span></div>`;
        disclaimerText = `*"이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."*\n\n`;
      }

      // 전체 결합
      const combinedHtml = `
        <div style="font-family: 'NanumGothic', 'Malgun Gothic', sans-serif; font-size: 17px; color: #333333; line-height: 1.8; padding: 20px; max-width: 800px; margin: 0 auto;">
          ${disclaimerHtml}
          ${summaryHtml}
          <div style="margin-top: 40px;">
            ${bodyHtml}
          </div>
          <br /><br /><br /><br /><br /><br /><br />
        </div>
      `;

      plainTextCombined = `${disclaimerText}${summaryText}\n\n${contentRef.current.innerText}\n\n\n\n\n\n\n`;

      const blobHtml = new Blob([combinedHtml], { type: "text/html" });
      const blobText = new Blob([plainTextCombined], { type: "text/plain" });

      const data: ClipboardItem[] = [
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
          ...(clipboardImageBlob && { "image/png": clipboardImageBlob }),
        }),
      ];

      // iOS Safari 등 일부 모바일 브라우저 대응을 위해 navigator.clipboard.write 사용
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write(data);
      } else {
        throw new Error("Clipboard write not supported");
      }

      setActiveButton("htmlT");
      window.setTimeout(() => setActiveButton(null), 2000);
    } catch (err) {
      console.error("티스토리 본문 복사 실패:", err);
      // 모바일 등에서 ClipboardItem 미지원 시 텍스트만이라도 복사 시도
      if (!plainTextCombined) {
        plainTextCombined = `${descriptionRef.current?.innerText || ""}\n\n${contentRef.current?.innerText || ""}`;
      }
      void copyToClipboard(plainTextCombined, "htmlT");
    }
  };

  // 본문 HTML 복사 (네이버 블로그용 - 스마트에디터 ONE 최적화)
  const handleCopyHtmlN = async () => {
    if (!contentRef?.current || !descriptionRef?.current) return;

    try {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";

      // 1. 요약 박스 (네이버 최적화: 단순 Div 구조 + 명확한 인라인 스타일 - 글자색 검은색으로 변경)
      const summaryText = descriptionRef.current.innerText;
      const summaryHtml = `
        <div style="margin: 20px 0; padding: 25px 30px; border-left: 5px solid #14b8a6; background-color: #f0fdfa; border-radius: 0 10px 10px 0; text-align: left;">
          <p style="color: #065f46; font-size: 19px; font-weight: bold; line-height: 1.8; margin: 0; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif; letter-spacing: -0.5px;">
            ${summaryText}
          </p>
        </div>
      `;

      // 2. 본문 내용 가공
      const contentCloneN = contentRef.current.cloneNode(
        true,
      ) as HTMLDivElement;

      // ──────────────────────────────────────────────────
      // ⭐ [근본 해결책] 네이버 블로그 이미지 영구 URL 처리
      //
      // 문제:
      //  - 외부 URL 그대로 → 시간이 지나면 토큰 만료 / Referer 차단으로 이미지 깨짐
      //  - Base64(data:image/...) → 네이버 스마트에디터에서 "허용되지 않는 형식" 오류
      //
      // 해결책:
      //  - /api/upload-naver-image 로 이미지를 전송
      //  - 서버에서 Supabase Storage(product-images 버킷)에 영구 저장
      //  - 반환된 영구 공개 URL로 img src 교체
      //  - 이 URL은 만료되지 않으므로 네이버 블로그에서도 영원히 표시됨
      // ──────────────────────────────────────────────────
      const imagesN = Array.from(contentCloneN.querySelectorAll("img"));

      for (const img of imagesN) {
        // Lazy Load / srcset 속성 제거 (네이버 에디터 호환성)
        img.removeAttribute("loading");
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.removeAttribute("decoding");

        const srcUrl = img.getAttribute("src");
        if (!srcUrl) continue;

        // 원본 URL 추출 (프록시를 통하는 경우 원본 URL 복원)
        let originalUrl = srcUrl;
        if (srcUrl.includes("/api/proxy-image")) {
          const urlMatch = srcUrl.match(/url=([^&]+)/);
          if (urlMatch) originalUrl = decodeURIComponent(urlMatch[1]);
        } else if (srcUrl.startsWith("/")) {
          originalUrl = baseUrl + srcUrl;
        }

        try {
          // 서버사이드 영구 업로드 API 호출
          const uploadRes = await fetch("/api/upload-naver-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: originalUrl }),
          });

          if (uploadRes.ok) {
            const { permanentUrl } = (await uploadRes.json()) as {
              permanentUrl: string;
            };
            img.setAttribute("src", permanentUrl);
          } else {
            // 업로드 실패 시 fallback: 원본 URL (avif/webp → jpg)
            const fallback = originalUrl.replace(
              /\.(avif|webp)(?=\?|$)/i,
              ".jpg",
            );
            img.setAttribute("src", fallback);
          }
        } catch (err) {
          console.error("이미지 영구 업로드 실패 (네이버용):", err);
          // 네트워크 오류 등 fallback
          const fallback = originalUrl.replace(
            /\.(avif|webp)(?=\?|$)/i,
            ".jpg",
          );
          img.setAttribute("src", fallback);
        }
      }

      // 테이블 스타일링 (클론 DOM 조작)
      const tablesN = Array.from(contentCloneN.querySelectorAll("table"));
      for (const table of tablesN) {
        table.setAttribute(
          "style",
          "width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 16px; text-align: left; border: 1px solid #d1d5db; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;",
        );

        const ths = Array.from(table.querySelectorAll("th"));
        for (const th of ths) {
          th.setAttribute(
            "style",
            "padding: 12px 15px; font-weight: bold; text-align: center; border: 1px solid #d1d5db; color: #111827; background-color: #ecfdf5;",
          );
        }

        const trs = Array.from(table.querySelectorAll("tr"));
        for (const tr of trs) {
          tr.setAttribute("style", "border-bottom: 1px solid #d1d5db;");

          const tds = Array.from(tr.querySelectorAll("td"));
          if (tds.length > 0) {
            tds[0].setAttribute(
              "style",
              "padding: 12px 15px; border: 1px solid #d1d5db; color: #374151; background-color: #ecfdf5; font-weight: 500;",
            );
            for (let i = 1; i < tds.length; i++) {
              tds[i].setAttribute(
                "style",
                "padding: 12px 15px; border: 1px solid #d1d5db; color: #374151;",
              );
            }
          }
        }
      }

      let bodyHtml = contentCloneN.innerHTML;

      // 티스토리/네이버 등 일부 에디터에서 첫 행(th, thead)이 올바르게 렌더링되지 않거나 무시되는 현상을 방지하기 위해 일반 td와 tbody로 강제 변환
      bodyHtml = bodyHtml
        .replace(/<thead/gi, "<tbody")
        .replace(/<\/thead>/gi, "</tbody>");
      bodyHtml = bodyHtml.replace(/<th/gi, "<td").replace(/<\/th>/gi, "</td>");

      // ⭐ 이미지가 이미 Base64로 변환됐으므로 절대 URL 치환은 건너뜁니다.
      // (변환 실패한 이미지만 fallbackUrl로 처리했으므로 추가 치환 불필요)

      // 네이버 블로그 스마트에디터 최적화 스타일 주입

      // 제목 스타일 처리 (에메랄드 색상 + 상단 빈 줄 추가)
      const h1Style =
        "color: #059669; font-size: 24px; font-weight: bold; margin: 20px 0; line-height: 1.4; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;";
      bodyHtml = bodyHtml.replace(
        /<h1[^>]*>(.*?)<\/h1>/gi,
        `<br /><h1 style="${h1Style}">$1</h1>`,
      );

      const h2Style =
        "color: #059669; font-size: 22px; font-weight: bold; margin: 20px 0; line-height: 1.4; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;";
      bodyHtml = bodyHtml.replace(
        /<h2[^>]*>(.*?)<\/h2>/gi,
        (match, content) => {
          // 레시피 정보(이모지 포함)인 경우 검은색(#000000) 적용 및 간격 축소
          const isRecipeInfo = content.match(/[🍽️👥🔥⭐⏱️]/);
          if (isRecipeInfo) {
            const recipeStyle = h2Style
              .replace("color: #059669;", "color: #000000;")
              .replace("margin: 20px 0;", "margin: 5px 0;");
            return `<h2 style="${recipeStyle}">${content}</h2>`;
          }
          return `<br /><h2 style="${h2Style}">${content}</h2>`;
        },
      );

      const h3Style =
        "color: #059669; font-size: 20px; font-weight: bold; margin: 20px 0; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;";
      bodyHtml = bodyHtml.replace(
        /<h3[^>]*>(.*?)<\/h3>/gi,
        (match, content) => {
          // 레시피 정보(이모지 포함)인 경우 검은색(#000000) 적용 및 간격 축소
          const isRecipeInfo = content.match(/[🍽️👥🔥⭐⏱️]/);
          if (isRecipeInfo) {
            const recipeStyle = h3Style
              .replace("color: #059669;", "color: #000000;")
              .replace("margin: 20px 0;", "margin: 5px 0;");
            return `<h3 style="${recipeStyle}">${content}</h3>`;
          }
          return `<br /><h3 style="${h3Style}">${content}</h3>`;
        },
      );

      // 특정 중요 헤더 텍스트 색상 및 크기 강제 지정 (text-emerald-600: #059669, font-size: 30px)
      const specialHeaders = [
        "📋 요리 정보 (Cooking Info)",
        "🛒 오늘의 재료 (Today's Ingredients)",
        "🍳 요리 가이드 (Cooking Guide)",
      ];

      specialHeaders.forEach((header) => {
        const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const reg = new RegExp(escaped, "g");

        // "오늘의 재료"와 "요리 가이드" 헤더 위에 빈 줄 추가
        const needsExtraSpace =
          header.includes("오늘의 재료") || header.includes("요리 가이드");
        const prefix = needsExtraSpace ? "<br />" : "";

        bodyHtml = bodyHtml.replace(
          reg,
          `${prefix}<span style="color: #059669; font-size: 30px; font-weight: bold;">${header}</span>`,
        );
      });

      // 단락 p 스타일 (네이버 기본 폰트 감안) - 위에서 처리되지 않은 나머지 p 태그들 전용
      const pStyle =
        "color: #333333; font-size: 17px; line-height: 1.9; margin: 15px 0; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif; word-break: break-all;";
      bodyHtml = bodyHtml.replace(
        /<p([^>]*)>(.*?)<\/p>/gi,
        (match, attr, content) => {
          if (attr.includes("text-center")) {
            return `<p style="${pStyle.replace("color: #333333;", "color: #888888;").replace("font-size: 17px;", "font-size: 15px;")} text-align: center; font-style: italic;">${content}</p>`;
          }
          // 레시피 정보(이모지 포함)인 경우 검은색(#000000) 적용 및 간격 축소
          const isRecipeInfo = content.match(/[🍽️👥🔥⭐⏱️]/);
          const finalPStyle = isRecipeInfo
            ? pStyle
                .replace("color: #333333;", "color: #000000;")
                .replace("margin: 15px 0;", "margin: 2px 0;")
            : pStyle;
          return `<p style="${finalPStyle}">${content}</p>`;
        },
      );

      // 이미지 스타일 (네이버 에디터 대응: 중앙 정렬 강조)
      bodyHtml = bodyHtml.replace(
        /<img([^>]+)>/gi,
        '<div style="text-align: center; margin: 40px 0;"><img $1 style="max-width: 100%; height: auto; border-radius: 8px;"></div>',
      );

      // 리스트 스타일
      const listStyle =
        "color: #333333; font-size: 17px; line-height: 1.8; margin: 15px 0; padding-left: 20px; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;";
      bodyHtml = bodyHtml.replace(/<ul[^>]*>/gi, `<ul style="${listStyle}">`);
      bodyHtml = bodyHtml.replace(/<ol[^>]*>/gi, `<ol style="${listStyle}">`);
      bodyHtml = bodyHtml.replace(
        /<li[^>]*>/gi,
        "<li style='margin-bottom: 8px;'>",
      );

      // 강조 및 인용구
      bodyHtml = bodyHtml.replace(
        /<strong[^>]*>/gi,
        "<strong style='color: #000000; font-weight: bold;'>",
      );
      const bqStyle =
        "border-left: 4px solid #d1d5db; padding: 15px 25px; margin: 30px 0; background-color: #f9fafb; color: #666666; font-size: 16px; italic;";
      bodyHtml = bodyHtml.replace(
        /<blockquote[^>]*>/gi,
        `<blockquote style="${bqStyle}">`,
      );

      // [최종 처리] 오늘의 재료와 요리 가이드 사이의 텍스트 스타일링 (검은색, 크기 24px, 굵기 제거)
      const ingredientsSectionPattern =
        /(🛒 오늘의 재료 \(Today's Ingredients\)<\/span>)([\s\S]*?)(<br \/><span[^>]*>🍳 요리 가이드 \(Cooking Guide\))/gi;

      bodyHtml = bodyHtml.replace(
        ingredientsSectionPattern,
        (_match: string, header1: string, content: string, header2: string) => {
          // 섹션 내부의 모든 HTML 태그들에 스타일 적용 (기존 스타일 덮어쓰기)
          const styledContent = content.replace(
            /<([a-z1-6]+)([^>]*)>/gi,
            (_tagMatch: string, tagName: string, attributes: string) => {
              // 이미지 태그 등 스타일링에서 제외할 태그 처리 (필요시)
              if (
                tagName.toLowerCase() === "img" ||
                tagName.toLowerCase() === "br"
              )
                return _tagMatch;

              const baseStyle =
                "color: #000000 !important; font-size: 24px !important; font-weight: normal !important; line-height: 1.8 !important; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif !important;";

              // 기존 style 속성이 있으면 교체, 없으면 추가
              if (attributes.includes("style=")) {
                return `<${tagName}${attributes.replace(/style="[^"]*"/, `style="${baseStyle}"`)}>`;
              } else {
                return `<${tagName}${attributes} style="${baseStyle}">`;
              }
            },
          );

          return `${header1}<div style="color: #000000; font-size: 24px; font-weight: normal; line-height: 1.8;">${styledContent}</div>${header2}`;
        },
      );

      // [최종 처리 2] 요리 가이드 이후의 텍스트 스타일링 (글자 크기 20px, 숫자 24px + 회색)
      const cookingGuideParts = bodyHtml.split(
        /<span[^>]*>🍳 요리 가이드 \(Cooking Guide\)<\/span>/i,
      );
      if (cookingGuideParts.length > 1) {
        const headerPart =
          cookingGuideParts[0] +
          '<span style="color: #059669; font-size: 30px; font-weight: bold;">🍳 요리 가이드 (Cooking Guide)</span>';
        let remainingContent = cookingGuideParts
          .slice(1)
          .join(
            '<span style="color: #059669; font-size: 30px; font-weight: bold;">🍳 요리 가이드 (Cooking Guide)</span>',
          );

        // 1. 모든 태그에 font-size: 20px 적용
        remainingContent = remainingContent.replace(
          /<([a-z1-6]+)([^>]*)>/gi,
          (_tagMatch: string, tagName: string, attributes: string) => {
            if (
              tagName.toLowerCase() === "img" ||
              tagName.toLowerCase() === "br"
            )
              return _tagMatch;

            const baseStyle =
              "color: #333333 !important; font-size: 20px !important; font-weight: normal !important; line-height: 1.8 !important; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif !important;";

            if (attributes.includes("style=")) {
              return `<${tagName}${attributes.replace(/style="[^"]*"/, `style="${baseStyle}"`)}>`;
            } else {
              return `<${tagName}${attributes} style="${baseStyle}">`;
            }
          },
        );

        // 2. 숫자(1., 2., 3.) 스타일링: 글자 크기 24px, 회색(#888888)
        remainingContent = remainingContent.replace(
          /(>|^|\s)(\d+\.)(\s)/g,
          (_match, prefix, num, suffix) => {
            return `${prefix}<span style="color: #888888 !important; font-size: 24px !important; font-weight: bold !important; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif !important;">${num}</span>${suffix}`;
          },
        );

        bodyHtml = headerPart + remainingContent;
      }

      // 태그 생성 (태그N 방식: #태그1 #태그2 #태그3)
      const tagsHtml =
        processedTags.length > 0
          ? `<div style="margin-top: 40px; color: #059669; font-size: 16px; font-family: 'NanumGothic', 'Malgun Gothic', sans-serif;">${processedTags.map((t) => `#${t}`).join(" ")}</div>`
          : "";

      // 전체 결합
      const combinedHtml = `
        <div style="font-family: 'NanumGothic', 'Malgun Gothic', sans-serif; font-size: 17px; color: #333333; line-height: 1.8; padding: 20px; max-width: 800px; margin: 0 auto;">
          ${summaryHtml}
          <div style="margin-top: 40px;">
            ${bodyHtml}
          </div>
          <br /><br />
          ${tagsHtml}
        </div>
      `;

      const tagsTextForPlain =
        processedTags.length > 0
          ? `\n\n${processedTags.map((t) => `#${t}`).join(" ")}`
          : "";

      const blobHtml = new Blob([combinedHtml], { type: "text/html" });
      const blobText = new Blob(
        [
          `${summaryText}\n\n${contentRef.current.innerText}${tagsTextForPlain}`,
        ],
        { type: "text/plain" },
      );

      const data = [
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ];

      // iOS Safari 등 일부 모바일 브라우저 대응을 위해 navigator.clipboard.write 사용
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write(data);
      } else {
        throw new Error("Clipboard write not supported");
      }

      setActiveButton("htmlN");
      window.setTimeout(() => setActiveButton(null), 2000);
    } catch (err) {
      console.error("네이버 본문 복사 실패:", err);
      // 모바일 등에서 ClipboardItem 미지원 시 텍스트만이라도 복사 시도
      const tagsTextForPlain =
        processedTags.length > 0
          ? `\n\n${processedTags.map((t) => `#${t}`).join(" ")}`
          : "";
      const plainText = `${descriptionRef.current?.innerText || ""}\n\n${contentRef.current?.innerText || ""}${tagsTextForPlain}`;
      void copyToClipboard(plainText, "htmlN");
    }
  };

  // 스레드용 HTML 빌드 (figure 구조 적용)
  const buildThreadsHtml = (text: string, imageUrl: string | null) => {
    const formattedText = text.replace(/\n/g, "<br>");
    let html = `<div style="font-family: sans-serif; line-height: 1.6;">${formattedText}</div>`;

    if (imageUrl) {
      html += `
        <figure style="text-align: center; margin: 20px 0; padding: 0;">
          <img src="${imageUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="Thread Image">
        </figure>
      `;
    }
    return html;
  };

  // 스레드용 본문 복사 (제목 + 요약 + 첫 번째 이미지)
  const handleCopyThreads = async (buttonId: string = "threads") => {
    if (isProcessingRef.current) return;

    try {
      if (!title) return;
      isProcessingRef.current = true;

      const summaryText = descriptionRef?.current?.innerText || "";
      let plainText = `${title}\n\n${summaryText}\n\n`;

      // 1. 유형별 텍스트 구성
      const threadSuffix = `✔️스친들아 리포🔄 한번 눌러줘~\n✔️스하리 = 반하리!\n✔️늦더라도 무조건 달려간다!🏃‍♀️🏃`;

      if (type === "menu") {
        const threadTitle = menuDynamicTitle || title;
        plainText = `${threadTitle}\n\n${summaryText}\n\n${threadSuffix}\n\n#스레드1000명프로젝트\n#레시피\n\n`;
      } else if (type === "insight") {
        const categoryMap: Record<string, string> = {
          "내일의 AI": "#AI정보",
          "돈이 되는 소식": "#돈이되는소식",
          "궁금한 세상 이야기": "#궁금한세상이야기",
          "슬기로운 생활": "#생활정보,꿀팁",
          "오늘보다 건강하게": "#건강",
          "마음 채우기": "#자기계발",
        };
        const categoryTag = categoryMap[category] || "";
        const finalTag = categoryTag
          ? `#스레드1000명프로젝트\n${categoryTag}`
          : `#스레드1000명프로젝트`;
        plainText = `${title}\n\n${summaryText}\n\n${threadSuffix}\n\n${finalTag}\n\n`;
      }

      // 2. 이미지 추출 및 절대 경로 변환 (threadsT는 이미지 제외하므로 건너뜀)
      const firstImg =
        buttonId !== "threadsT"
          ? contentRef?.current?.querySelector("img")
          : null;
      let imageUrl = firstImg ? firstImg.getAttribute("src") : null;
      if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = window.location.origin + imageUrl;
      }

      // 3. 복사 컨텐츠 준비 (threadsT는 텍스트만 처리)
      if (
        buttonId !== "threadsT" &&
        imageUrl &&
        typeof ClipboardItem !== "undefined"
      ) {
        try {
          const response = await fetch(imageUrl);
          const rawBlob = await response.blob();

          const pngBlob = await new Promise<Blob | null>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            const blobUrl = URL.createObjectURL(rawBlob);

            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                URL.revokeObjectURL(blobUrl);
                resolve(null);
                return;
              }
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                URL.revokeObjectURL(blobUrl);
                resolve(blob);
              }, "image/png");
            };
            img.onerror = () => {
              URL.revokeObjectURL(blobUrl);
              resolve(null);
            };
            img.src = blobUrl;
          });

          if (pngBlob) {
            const threadsHtml = buildThreadsHtml(plainText, imageUrl);
            const data = [
              new ClipboardItem({
                "text/plain": new Blob([plainText], { type: "text/plain" }),
                "text/html": new Blob([threadsHtml], { type: "text/html" }),
                "image/png": pngBlob,
              }),
            ];
            await copyToClipboard(data, buttonId);
            return;
          }
        } catch (imgErr) {
          console.error("이미지 가공 중 오류 발생:", imgErr);
        }
      }

      // 4. 이미지 실패 시 텍스트 전용 복사
      await copyToClipboard(plainText, buttonId);
    } catch (err) {
      console.error("스레드 복사 실행 오류:", err);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Hydration mismatch 방지: 서버와 클라이언트의 초기 렌더링을 맞춤
  if (!mounted) {
    const containerClass =
      className ||
      (onlyTags
        ? "mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-gray-200 dark:border-white/10"
        : "mb-10 sm:mb-12");
    return (
      <div className={containerClass}>
        <div className="flex flex-col gap-3 sm:gap-4 h-24" />
      </div>
    );
  }

  const containerClass =
    className ||
    (onlyTags
      ? "mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-gray-200 dark:border-white/10"
      : "mb-10 sm:mb-12");

  return (
    <div className={containerClass}>
      <div className="flex flex-col gap-3 sm:gap-4">
        {!onlyButtons && processedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {processedTags.map((tag, index) => (
              <span
                key={`tag-${tag}-${index}`}
                className="
                inline-flex items-center
                px-3 py-1.5 sm:px-4 sm:py-2
                rounded-full
                text-xs sm:text-sm
                font-medium
                bg-emerald-50 dark:bg-emerald-900/30
                text-emerald-700 dark:text-emerald-300
                border border-emerald-200 dark:border-emerald-700/50
                transition-colors duration-300
              "
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {!onlyTags && (
          <div className="flex flex-wrap gap-2 mt-1">
            <button
              type="button"
              onClick={handleCopyTitle}
              className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              text-xs sm:text-sm
              font-medium
              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
              dark:bg-emerald-600 dark:hover:bg-emerald-500
              text-white
              shadow-sm hover:shadow-md active:shadow
              transition-all duration-300
              hover:-translate-y-0.5 active:scale-98
              self-start
            "
              aria-label="제목 복사"
            >
              {activeButton === "title" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>제목</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyHtmlT}
              className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              text-xs sm:text-sm
              font-medium
              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
              dark:bg-emerald-600 dark:hover:bg-emerald-500
              text-white
              shadow-sm hover:shadow-md active:shadow
              transition-all duration-300
              hover:-translate-y-0.5 active:scale-98
              self-start
            "
              aria-label="본문T 복사"
            >
              {activeButton === "htmlT" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>본문T</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyTag1}
              className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              text-xs sm:text-sm
              font-medium
              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
              dark:bg-emerald-600 dark:hover:bg-emerald-500
              text-white
              shadow-sm hover:shadow-md active:shadow
              transition-all duration-300
              hover:-translate-y-0.5 active:scale-98
              self-start
            "
              aria-label="태그T 복사"
            >
              {activeButton === "tag1" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <Hash className="w-4 h-4" />
                  <span>태그T</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyHtmlN}
              className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              text-xs sm:text-sm
              font-medium
              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
              dark:bg-emerald-600 dark:hover:bg-emerald-500
              text-white
              shadow-sm hover:shadow-md active:shadow
              transition-all duration-300
              hover:-translate-y-0.5 active:scale-98
              self-start
            "
              aria-label="본문N 복사"
            >
              {activeButton === "htmlN" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>본문N</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyTag2}
              className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              text-xs sm:text-sm
              font-medium
              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
              dark:bg-emerald-600 dark:hover:bg-emerald-500
              text-white
              shadow-sm hover:shadow-md active:shadow
              transition-all duration-300
              hover:-translate-y-0.5 active:scale-98
              self-start
            "
              aria-label="태그N 복사"
            >
              {activeButton === "tag2" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <Hash className="w-4 h-4" />
                  <span>태그N</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleCopyThreads("threadsN")}
              className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              text-xs sm:text-sm
              font-medium
              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
              dark:bg-emerald-600 dark:hover:bg-emerald-500
              text-white
              shadow-sm hover:shadow-md active:shadow
              transition-all duration-300
              hover:-translate-y-0.5 active:scale-98
              self-start
            "
              aria-label="스레드N 복사"
            >
              {activeButton === "threadsN" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <AtSign className="w-4 h-4" />
                  <span>스레드N</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleCopyThreads("threadsT")}
              className="
              inline-flex items-center gap-2
              px-4 py-2.5
              rounded-lg
              text-xs sm:text-sm
              font-medium
              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
              dark:bg-emerald-600 dark:hover:bg-emerald-500
              text-white
              shadow-sm hover:shadow-md active:shadow
              transition-all duration-300
              hover:-translate-y-0.5 active:scale-98
              self-start
            "
              aria-label="스레드T 복사"
            >
              {activeButton === "threadsT" ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>복사 완료!</span>
                </>
              ) : (
                <>
                  <AtSign className="w-4 h-4" />
                  <span>스레드T</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
