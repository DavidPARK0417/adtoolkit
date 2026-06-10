"use client";

import React from "react";
import { ShoppingBag, Copy, Check } from "lucide-react";

interface InsightProductTagsProps {
  products: string[];
}

export default function InsightProductTags({
  products,
}: InsightProductTagsProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copyToClipboard = async (
    htmlText: string,
    plainText: string,
    id: string,
  ) => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        // HTML 포맷과 일반 텍스트 포맷 모두 클립보드에 기록 (티스토리 등 호환)
        const typeText = new Blob([plainText], { type: "text/plain" });
        const typeHtml = new Blob([htmlText], { type: "text/html" });
        const data = [
          new ClipboardItem({ "text/plain": typeText, "text/html": typeHtml }),
        ];
        await navigator.clipboard.write(data);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(plainText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = plainText;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
      <button
        type="button"
        onClick={() =>
          copyToClipboard(
            `<div style="text-align: center;" align="center"><span style="color: #ff9800;"><i>"이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."</i></span></div>`,
            `*"이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."*`,
            "header",
          )
        }
        aria-label="쿠팡 파트너스 문구 복사"
        className={`
          flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium shrink-0 rounded-full border transition-all duration-200 cursor-pointer
          ${
            copiedId === "header"
              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-sm"
          }
        `}
      >
        {copiedId === "header" ? (
          <>
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>복사됨</span>
          </>
        ) : (
          <>
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>추천 상품</span>
          </>
        )}
      </button>

      {products.map((product, index) => {
        const id = `product-${index}`;
        const isCopied = copiedId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => copyToClipboard(product, product, id)}
            aria-label={`${product} 복사`}
            className={`
              inline-flex items-center gap-1.5
              px-2.5 py-1
              rounded-full
              text-xs font-medium
              border
              transition-all duration-200
              cursor-pointer
              ${
                isCopied
                  ? "bg-emerald-500 dark:bg-emerald-500 text-white border-emerald-500 shadow-sm"
                  : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-sm"
              }
            `}
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 shrink-0" />
                <span>복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 shrink-0 opacity-50" />
                <span>{product}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
