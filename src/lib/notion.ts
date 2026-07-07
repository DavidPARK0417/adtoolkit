import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import cache, { CacheKeys } from "./cache";

// Notion API 타입 정의
interface NotionFilter {
  property?: string;
  checkbox?: { equals: boolean };
  rich_text?: { equals: string };
  select?: { equals: string };
  and?: NotionFilter[];
  [key: string]: unknown;
}

interface NotionSort {
  timestamp?: "created_time" | "last_edited_time";
  direction?: "ascending" | "descending";
  property?: string;
  [key: string]: unknown;
}

interface NotionRichText {
  plain_text: string;
  [key: string]: unknown;
}

interface NotionTitle {
  title: NotionRichText[];
}

interface NotionPage {
  id: string;
  properties: {
    title?: NotionTitle;
    slug?: { rich_text: NotionRichText[] };
    metaDescription?: { rich_text: NotionRichText[] };
    Published?: { checkbox: boolean };
    blogPost?: { rich_text: NotionRichText[] };
    category?: { rich_text: NotionRichText[] };
    date?: { date: { start: string } | null };
    tags?: {
      multi_select?: { name: string; color?: string }[];
      rich_text?: NotionRichText[];
    };
    products?: {
      multi_select?: { name: string; color?: string }[];
      rich_text?: NotionRichText[];
    };
    prompt1?: { rich_text: NotionRichText[] };
    prompt2?: { rich_text: NotionRichText[] };
    prompt3?: { rich_text: NotionRichText[] };
    prompt4?: { rich_text: NotionRichText[] };
    prompt5?: { rich_text: NotionRichText[] };
    prompt6?: { rich_text: NotionRichText[] };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface NotionQueryResponse {
  results: NotionPage[];
  next_cursor?: string | null;
  has_more: boolean;
  [key: string]: unknown;
}

// Notion 블록 타입 정의
interface NotionImageBlock {
  type: "image";
  image: {
    type: "external" | "file";
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time?: string;
    };
    caption?: NotionRichText[];
  };
  id: string;
  [key: string]: unknown;
}

interface NotionBlock {
  type: string;
  id: string;
  has_children?: boolean;
  [key: string]: unknown;
}

// 페이지네이션 결과 타입
export interface PaginatedPosts {
  posts: Post[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Notion 클라이언트를 생성합니다
 * 환경 변수가 없으면 에러를 throw합니다
 */
function getNotionClient(): Client {
  // 환경 변수에서 API 키 가져오기 (따옴표 제거)
  let apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NOTION_API_KEY is not defined in environment variables. " +
        "Please add NOTION_API_KEY to your .env.local file.",
    );
  }

  // 환경 변수에서 따옴표가 포함되어 있을 수 있으므로 제거
  apiKey = apiKey.trim().replace(/^["']|["']$/g, "");

  // API 키 형식 검증 및 로깅 (개발 환경에서만)
  if (process.env.NODE_ENV === "development") {
    console.log("🔑 API 키 확인:", {
      keyPrefix: apiKey.substring(0, 10) + "...",
      keyLength: apiKey.length,
      startsWithSecret: apiKey.startsWith("secret_"),
      startsWithNtn: apiKey.startsWith("ntn_"),
    });
  }

  if (!apiKey.startsWith("secret_") && !apiKey.startsWith("ntn_")) {
    console.warn(
      "⚠️ WARNING: NOTION_API_KEY 형식이 예상과 다릅니다. " +
        "일반적으로 'secret_' 또는 'ntn_'으로 시작해야 합니다. " +
        "현재 키: " +
        apiKey.substring(0, 10) +
        "...",
    );
  }

  try {
    const client = new Client({
      auth: apiKey,
    });

    // 클라이언트가 제대로 생성되었는지 확인
    if (!client) {
      throw new Error("Notion Client 생성 실패: 클라이언트 객체가 null입니다.");
    }

    // databases 속성이 존재하는지 확인
    if (!client.databases) {
      throw new Error(
        "Notion Client 생성 실패: 'databases' 속성이 없습니다. " +
          "SDK 버전이나 초기화 방식에 문제가 있을 수 있습니다.",
      );
    }

    // 사용 가능한 메서드 확인 및 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === "development") {
      const databasesKeys = Object.keys(client.databases);
      console.log("📋 사용 가능한 databases 메서드:", databasesKeys);
      console.log(
        "✅ Notion Client가 생성되었습니다. (HTTP API를 직접 사용합니다)",
      );
    }

    return client;
  } catch (error) {
    console.error("❌ Notion Client 생성 중 오류 발생:", error);
    throw error;
  }
}

/**
 * Notion to Markdown 변환기를 생성합니다
 */
function getNotionToMarkdown() {
  const notion = getNotionClient();
  const n2m = new NotionToMarkdown({ notionClient: notion });

  // 이미지 블록에 대한 커스텀 변환기 설정
  // Notion API에서 직접 이미지 URL을 가져와서 사용
  n2m.setCustomTransformer("image", async (block) => {
    try {
      const imageBlock = block as NotionImageBlock;
      const { image } = imageBlock;

      // 이미지 URL 추출
      let imageUrl = "";
      let caption = "";
      let imageType = "";

      if (image) {
        // External 이미지 (외부 URL)
        if (image.type === "external" && image.external?.url) {
          imageUrl = image.external.url;
          imageType = "external";
        }
        // File 이미지 (Notion에 업로드된 파일)
        else if (image.type === "file" && image.file?.url) {
          imageUrl = image.file.url;
          imageType = "file";
        }

        // URL 정규화: thumbnews URL은 원본 그대로 사용 (실제로 작동함)
        // 참고: thumbnews.nateimg.co.kr/view610///news.nateimg.co.kr/... 형식도 실제로 작동함
        if (imageUrl) {
          // 단순히 앞뒤 공백만 제거 (URL 변환하지 않음)
          imageUrl = imageUrl.trim();

          // 디버깅: 원본 URL 유지 확인 (개발 환경에서만)
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[getNotionToMarkdown] 이미지 URL (원본 유지): ${imageUrl.substring(0, 100)}...`,
            );
          }
        }

        // 캡션 추출
        if (image.caption && image.caption.length > 0) {
          caption = image.caption
            .map((cap: { plain_text?: string }) => cap.plain_text || "")
            .join("");
        }
      }

      // URL이 없으면 빈 문자열 반환
      if (!imageUrl) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[getNotionToMarkdown] 이미지 URL을 찾을 수 없습니다:",
            JSON.stringify(block, null, 2).substring(0, 300),
          );
        }
        return "";
      }

      // 디버깅: 이미지 URL 로그 (개발 환경에서만)
      if (process.env.NODE_ENV === "development") {
        console.log(`[getNotionToMarkdown] 이미지 변환 성공:`, {
          type: imageType,
          url: imageUrl.substring(0, 100) + "...",
          hasCaption: !!caption,
          captionLength: caption.length,
        });
      }

      // 마크다운 이미지 형식으로 반환
      if (caption) {
        return `![${caption}](${imageUrl})`;
      } else {
        return `![](${imageUrl})`;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[getNotionToMarkdown] 이미지 변환 오류:", error);
      }
      return "";
    }
  });

  return n2m;
}

/**
 * 요청 간 지연을 위한 헬퍼 함수
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 요청 큐를 위한 타입 정의
type QueuedRequest = {
  resolve: (value: NotionQueryResponse) => void;
  reject: (error: Error) => void;
  params: {
    database_id: string;
    filter?: NotionFilter;
    sorts?: NotionSort[];
    page_size?: number;
    start_cursor?: string;
  };
  retryCount: number;
};

// 요청 큐 및 처리 상태
const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
// 빌드 시 rate limiting 방지를 위해 요청 간격 증가 (1초)
const MIN_REQUEST_INTERVAL = process.env.NODE_ENV === "production" ? 1000 : 500;

/**
 * 요청 큐를 순차적으로 처리하는 함수
 */
async function processRequestQueue(): Promise<void> {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (!request) break;

    try {
      // 요청 간 최소 지연 시간 (Rate limit 방지)
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await delay(waitTime);
      }

      const result = await executeNotionRequest(
        request.params,
        request.retryCount,
      );
      lastRequestTime = Date.now();
      request.resolve(result);
    } catch (error) {
      // Rate limit 오류인 경우 재시도
      if (
        error instanceof Error &&
        error.message.includes("Rate Limit (429)")
      ) {
        const maxRetries = 5;
        if (request.retryCount < maxRetries) {
          // 재시도를 위해 큐의 앞에 다시 추가
          request.retryCount++;
          requestQueue.unshift(request);

          // 에러 메시지에서 대기 시간 추출 시도
          // 패턴: "XXX초 후 재시도 필요" 또는 "XXXms 후 재시도"
          let waitTime = Math.min(
            Math.pow(2, request.retryCount) * 1000,
            60000,
          );

          // 초 단위 추출 (예: "124초 후")
          const secondsMatch = error.message.match(/(\d+)초/);
          if (secondsMatch) {
            waitTime = parseInt(secondsMatch[1], 10) * 1000;
          } else {
            // 밀리초 단위 추출 (예: "124000ms")
            const msMatch = error.message.match(/(\d+)ms/);
            if (msMatch) {
              waitTime = parseInt(msMatch[1], 10);
            } else {
              // 숫자만 추출 (초로 가정)
              const numberMatch = error.message.match(/(\d+)/);
              if (numberMatch) {
                const extracted = parseInt(numberMatch[1], 10);
                // 큰 숫자면 밀리초, 작은 숫자면 초로 가정
                waitTime = extracted > 1000 ? extracted : extracted * 1000;
              }
            }
          }

          // 최대 대기 시간 제한 (5분)
          waitTime = Math.min(waitTime, 300000);

          if (process.env.NODE_ENV === "development") {
            console.warn(
              `⚠️ Notion API Rate Limit (429). ${Math.round(waitTime / 1000)}초 후 재시도... (${request.retryCount}/${maxRetries})`,
            );
          }

          await delay(waitTime);
        } else {
          request.reject(error);
        }
      } else {
        request.reject(error as Error);
      }
    }
  }

  isProcessingQueue = false;
}

/**
 * 실제 Notion API 요청을 실행하는 함수
 */
async function executeNotionRequest(
  params: {
    database_id: string;
    filter?: NotionFilter;
    sorts?: NotionSort[];
    page_size?: number;
    start_cursor?: string;
  },
  retryCount: number = 0,
): Promise<NotionQueryResponse> {
  const apiKey = process.env.NOTION_API_KEY?.trim().replace(/^["']|["']$/g, "");

  if (!apiKey) {
    throw new Error("NOTION_API_KEY is not defined");
  }

  const body: {
    filter?: NotionFilter;
    sorts?: NotionSort[];
    page_size?: number;
    start_cursor?: string;
  } = {
    filter: params.filter,
    sorts: params.sorts,
  };

  if (params.page_size) {
    body.page_size = params.page_size;
  }

  if (params.start_cursor) {
    body.start_cursor = params.start_cursor;
  }

  const response = await fetch(
    `https://api.notion.com/v1/databases/${params.database_id}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  // Rate limit 오류 처리 (429)
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const errorText = await response.text();

    // Retry-After 헤더가 있으면 해당 시간만큼 대기, 없으면 지수 백오프 사용
    let waitTime: number;
    if (retryAfter) {
      waitTime = parseInt(retryAfter, 10) * 1000; // 초를 밀리초로 변환
    } else {
      // 지수 백오프: 2^retryCount 초 (최대 60초)
      waitTime = Math.min(Math.pow(2, retryCount) * 1000, 60000);
    }

    throw new Error(
      `Notion API Rate Limit (429): ${waitTime / 1000}초 후 재시도 필요. ${errorText}`,
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API 오류 (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Notion API를 직접 호출하여 데이터베이스를 쿼리합니다
 * SDK에 query 메서드가 없을 때 사용합니다
 * Rate limit 오류 시 자동 재시도 로직 포함
 * 요청 큐를 통해 순차적으로 처리됩니다
 */
async function queryNotionDatabase(
  params: {
    database_id: string;
    filter?: NotionFilter;
    sorts?: NotionSort[];
    page_size?: number;
    start_cursor?: string;
  },
  retryCount: number = 0,
): Promise<NotionQueryResponse> {
  return new Promise((resolve, reject) => {
    // 요청을 큐에 추가
    requestQueue.push({
      resolve,
      reject,
      params,
      retryCount,
    });

    // 큐 처리 시작 (비동기로 실행)
    processRequestQueue().catch((error) => {
      console.error("요청 큐 처리 중 오류:", error);
    });
  });
}

// Post 인터페이스 정의
export interface Post {
  id: string;
  title: string;
  slug: string;
  metaDescription: string;
  published: boolean;
  blogPost: string;
  category?: string; // 카테고리 추가
  date?: string; // 날짜 추가
  tags?: string[]; // 태그 추가
  products?: string[]; // 추천 상품 태그
  featuredImage?: string; // 대표 이미지 추가
  prompt1?: string;
  prompt2?: string;
  prompt3?: string;
  prompt4?: string;
  prompt5?: string;
  prompt6?: string;
}

/**
 * Notion 페이지 데이터를 Post 객체로 변환합니다
 * @param page Notion 페이지 데이터
 * @param fetchContent 본문 콘텐츠에서 이미지를 추출할지 여부
 */
export async function mapNotionPageToPost(
  page: NotionPage,
  fetchContent: boolean = false,
): Promise<Post> {
  const p = page.properties;
  const blogPostContent = p.blogPost?.rich_text
    ? p.blogPost.rich_text.map((rt: NotionRichText) => rt.plain_text).join("")
    : "";

  let featuredImage: string | undefined = undefined;

  // 1. featuredImage 속성 확인
  const fImg = p.featuredImage as
    | {
        type: "files";
        files: Array<{
          type: "external" | "file";
          external?: { url: string };
          file?: { url: string };
        }>;
      }
    | { type: "url"; url: string }
    | undefined;

  if (fImg) {
    if (fImg.type === "files" && fImg.files && fImg.files.length > 0) {
      const file = fImg.files[0];
      featuredImage =
        file.type === "external" ? file.external?.url : file.file?.url;
    } else if (fImg.type === "url" && fImg.url) {
      featuredImage = fImg.url;
    }
  }

  // 2. image 속성 확인
  if (!featuredImage) {
    const img = p.image as
      | {
          type: "files";
          files: Array<{
            type: "external" | "file";
            external?: { url: string };
            file?: { url: string };
          }>;
        }
      | undefined;
    if (img && img.type === "files" && img.files && img.files.length > 0) {
      const file = img.files[0];
      featuredImage =
        file.type === "external" ? file.external?.url : file.file?.url;
    }
  }

  // 3. blogPost 필드에서 추출
  if (!featuredImage) {
    featuredImage = extractFirstImageUrl(blogPostContent);
  }

  // 4. 본문 콘텐츠에서 추출 (추가 요청 시)
  if (!featuredImage && fetchContent) {
    try {
      const fullContent = await getPostContent(page.id);
      featuredImage = extractFirstImageUrl(fullContent);
    } catch {
      // 이미지 추출 실패는 무시
    }
  }

  return {
    id: page.id,
    title: p.title?.title[0]?.plain_text || "Untitled",
    slug: p.slug?.rich_text?.[0]?.plain_text || "",
    metaDescription: p.metaDescription?.rich_text?.[0]?.plain_text || "",
    published: p.Published?.checkbox || false,
    blogPost: blogPostContent,
    category: p.category?.rich_text?.[0]?.plain_text || undefined,
    date: p.date?.date?.start || undefined,
    tags: (() => {
      if (p.tags?.multi_select && p.tags.multi_select.length > 0) {
        return p.tags.multi_select.map((tag) => tag.name);
      }
      if (p.tags?.rich_text && p.tags.rich_text.length > 0) {
        const text = p.tags.rich_text
          .map((rt: NotionRichText) => rt.plain_text)
          .join("");
        if (!text.trim()) return undefined;
        let arr: string[] = [];
        if (text.includes(",")) {
          arr = text
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        } else {
          arr = text
            .split(/\s+/)
            .map((t) => t.trim())
            .filter(Boolean);
        }
        return arr.map((t) => (t.startsWith("#") ? t.substring(1) : t));
      }
      return undefined;
    })(),
    products: (() => {
      if (p.products?.multi_select && p.products.multi_select.length > 0) {
        return p.products.multi_select.map((item) => item.name);
      }
      if (p.products?.rich_text && p.products.rich_text.length > 0) {
        const text = p.products.rich_text
          .map((rt: NotionRichText) => rt.plain_text)
          .join("");
        if (!text.trim()) return undefined;
        let arr: string[] = [];
        if (text.includes(",")) {
          arr = text
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        } else {
          arr = text
            .split(/\s+/)
            .map((t) => t.trim())
            .filter(Boolean);
        }
        return arr.map((t) => (t.startsWith("#") ? t.substring(1) : t));
      }
      return undefined;
    })(),
    featuredImage,
    prompt1: p.prompt1?.rich_text?.[0]?.plain_text || undefined,
    prompt2: p.prompt2?.rich_text?.[0]?.plain_text || undefined,
    prompt3: p.prompt3?.rich_text?.[0]?.plain_text || undefined,
    prompt4: p.prompt4?.rich_text?.[0]?.plain_text || undefined,
    prompt5: p.prompt5?.rich_text?.[0]?.plain_text || undefined,
    prompt6: p.prompt6?.rich_text?.[0]?.plain_text || undefined,
  };
}

/**
 * 마크다운 텍스트에서 첫 번째 이미지 URL을 추출합니다
 * @param markdown 마크다운 텍스트
 * @returns 첫 번째 이미지 URL 또는 undefined
 */
function extractFirstImageUrl(markdown: string): string | undefined {
  if (!markdown) return undefined;

  // 마크다운 이미지 문법: ![alt](url)
  const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i;
  const markdownMatch = markdown.match(markdownImageRegex);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1];
  }

  // HTML img 태그: <img src="url">
  const htmlImageRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i;
  const htmlMatch = markdown.match(htmlImageRegex);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }

  // 일반 URL 패턴 (이미지 확장자 포함)
  const urlImageRegex = /(https?:\/\/[^\s\)]+\.(jpg|jpeg|png|gif|webp|svg))/i;
  const urlMatch = markdown.match(urlImageRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  return undefined;
}

/**
 * Published된 게시글의 총 개수를 가져옵니다
 */
export async function getTotalPostsCount(): Promise<number> {
  // 캐시 확인
  const cacheKey = CacheKeys.totalPostsCount();
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    // 전체 개수를 가져오기 위해 큰 page_size로 한 번만 요청
    const data = await queryNotionDatabase({
      database_id: databaseId,
      filter: {
        property: "Published",
        checkbox: {
          equals: true,
        },
      },
      page_size: 100, // Notion API 최대값
    });

    let totalCount = data.results.length;
    let cursor = data.next_cursor;

    // 다음 페이지가 있으면 계속 가져오기
    while (cursor && data.has_more) {
      const nextData = await queryNotionDatabase({
        database_id: databaseId,
        filter: {
          property: "Published",
          checkbox: {
            equals: true,
          },
        },
        page_size: 100,
        start_cursor: cursor,
      });
      totalCount += nextData.results.length;
      cursor = nextData.next_cursor;
    }

    // 캐시에 저장 (60초)
    cache.set(cacheKey, totalCount, 60000);

    return totalCount;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching total posts count:", error);
    }
    throw error;
  }
}

/**
 * Published된 모든 게시글을 가져옵니다
 * 생성일 기준 내림차순으로 정렬됩니다
 */
export async function getPublishedPosts(): Promise<Post[]> {
  // 캐시 확인
  const cacheKey = CacheKeys.allPosts();
  const cached = cache.get<Post[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    // SDK에 query 메서드가 없으므로 직접 HTTP API 호출
    const data = await queryNotionDatabase({
      database_id: databaseId,
      filter: {
        property: "Published",
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: "date",
          direction: "descending",
        },
      ],
    });

    const posts: Post[] = await Promise.all(
      data.results.map((page: NotionPage) => mapNotionPageToPost(page, true)),
    );

    // 캐시에 저장 (60초)
    cache.set(cacheKey, posts, 60000);

    return posts;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching posts from Notion:", error);
    }
    throw error;
  }
}

/**
 * 페이지네이션을 지원하는 Published 게시글 조회
 * @param page 페이지 번호 (1부터 시작)
 * @param pageSize 페이지당 게시글 수 (기본값: 12)
 */
export async function getPublishedPostsPaginated(
  page: number = 1,
  pageSize: number = 12,
  includeContentImages: boolean = true,
): Promise<PaginatedPosts> {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    // 전체 개수 가져오기
    const totalCount = await getTotalPostsCount();
    const totalPages = Math.ceil(totalCount / pageSize);

    // 유효한 페이지 번호 확인
    const currentPage = Math.max(1, Math.min(page, totalPages || 1));

    // 필요한 데이터를 가져오기 위해 순차적으로 페이지네이션
    let allResults: NotionPage[] = [];
    let cursor: string | null | undefined = undefined;
    let hasMore = true;
    const targetStartIndex = (currentPage - 1) * pageSize;
    const targetEndIndex = targetStartIndex + pageSize;

    // 목표 인덱스까지 데이터 수집
    while (hasMore && allResults.length < targetEndIndex) {
      const data = await queryNotionDatabase({
        database_id: databaseId,
        filter: {
          property: "Published",
          checkbox: {
            equals: true,
          },
        },
        sorts: [
          {
            property: "date",
            direction: "descending",
          },
        ],
        page_size: 100, // 한 번에 많이 가져오기
        start_cursor: cursor || undefined,
      });

      allResults = allResults.concat(data.results);
      cursor = data.next_cursor;
      hasMore = data.has_more;

      // 목표 인덱스에 도달하면 중단
      if (allResults.length >= targetEndIndex) {
        break;
      }
    }

    // 현재 페이지에 해당하는 데이터만 추출
    const pageResults = allResults.slice(targetStartIndex, targetEndIndex);

    // 성능 최적화: 이미지 추출 로직 개선 (속성 우선, 본문은 필요할 때만)
    const posts: Post[] = await Promise.all(
      pageResults.map((page: NotionPage) =>
        mapNotionPageToPost(page, includeContentImages),
      ),
    );

    return {
      posts,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  } catch (error) {
    console.error("Error fetching paginated posts from Notion:", error);
    throw error;
  }
}

/**
 * 메인 페이지 전용: 캐시 없이 최신 인사이트 N개 가져오기
 * @param limit 가져올 인사이트 개수 (기본값: 3)
 * @returns 최신 인사이트 배열
 */
export async function getLatestPosts(limit: number = 3): Promise<Post[]> {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    const data = await queryNotionDatabase({
      database_id: databaseId,
      filter: {
        property: "Published",
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: "date",
          direction: "descending",
        },
      ],
      page_size: limit,
    });

    const posts: Post[] = await Promise.all(
      data.results.map((page: NotionPage) => mapNotionPageToPost(page, true)),
    );

    return posts;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching latest posts from Notion:", error);
    }
    throw error;
  }
}

/**
 * 카테고리별 Published 게시글의 총 개수를 가져옵니다
 */
export async function getTotalPostsCountByCategory(
  category: string,
): Promise<number> {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    try {
      const data = await queryNotionDatabase({
        database_id: databaseId,
        filter: {
          and: [
            {
              property: "Published",
              checkbox: {
                equals: true,
              },
            },
            {
              property: "category",
              rich_text: {
                equals: category,
              },
            },
          ],
        },
        page_size: 100,
      });

      let totalCount = data.results.length;
      let cursor = data.next_cursor;

      while (cursor && data.has_more) {
        const nextData = await queryNotionDatabase({
          database_id: databaseId,
          filter: {
            and: [
              {
                property: "Published",
                checkbox: {
                  equals: true,
                },
              },
              {
                property: "category",
                rich_text: {
                  equals: category,
                },
              },
            ],
          },
          page_size: 100,
          start_cursor: cursor,
        });
        totalCount += nextData.results.length;
        cursor = nextData.next_cursor;
      }

      return totalCount;
    } catch (categoryError: unknown) {
      const errorMessage =
        categoryError instanceof Error
          ? categoryError.message
          : String(categoryError);
      if (
        errorMessage.includes("validation_error") &&
        errorMessage.includes("category")
      ) {
        // category 속성이 없으면 전체에서 필터링
        const allPosts = await getPublishedPosts();
        return allPosts.filter(
          (post) => post.category && post.category === category,
        ).length;
      }
      throw categoryError;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching total posts count by category:", error);
    }
    throw error;
  }
}

/**
 * 카테고리별 Published 게시글을 가져옵니다
 *
 * 주의: Notion 데이터베이스에 'category' 속성이 없을 경우,
 * 모든 Published 게시글을 가져온 후 클라이언트 측에서 필터링합니다.
 */
export async function getPublishedPostsByCategory(
  category: string,
): Promise<Post[]> {
  // 캐시 확인
  const cacheKey = CacheKeys.postsByCategory(category);
  const cached = cache.get<Post[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    // 먼저 category 속성으로 필터링 시도
    try {
      const data = await queryNotionDatabase({
        database_id: databaseId,
        filter: {
          and: [
            {
              property: "Published",
              checkbox: {
                equals: true,
              },
            },
            {
              property: "category",
              rich_text: {
                equals: category,
              },
            },
          ],
        },
        sorts: [
          {
            property: "date",
            direction: "descending",
          },
        ],
        page_size: 100,
      });

      const posts: Post[] = await Promise.all(
        data.results.map((page: NotionPage) => mapNotionPageToPost(page, true)),
      );

      // 캐시에 저장 (60초)
      cache.set(cacheKey, posts, 60000);

      return posts;
    } catch (categoryError: unknown) {
      // category 속성이 없는 경우 (validation_error)
      const errorMessage =
        categoryError instanceof Error
          ? categoryError.message
          : String(categoryError);
      if (
        errorMessage.includes("validation_error") &&
        errorMessage.includes("category")
      ) {
        console.warn(
          "⚠️ Notion 데이터베이스에 'category' 속성이 없습니다. " +
            "모든 게시글을 가져온 후 클라이언트 측에서 필터링합니다.",
        );

        // 모든 Published 게시글을 가져온 후 클라이언트 측에서 필터링
        const allPosts = await getPublishedPosts();

        // category 속성이 있는 게시글만 필터링
        const filteredPosts = allPosts.filter(
          (post) => post.category && post.category === category,
        );

        // 캐시에 저장 (60초)
        cache.set(cacheKey, filteredPosts, 60000);

        return filteredPosts;
      }

      // 다른 에러는 그대로 throw
      throw categoryError;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching posts by category from Notion:", error);
    }
    throw error;
  }
}

/**
 * 카테고리별 최신 포스트를 지정된 개수만큼 가져옵니다
 * @param category 카테고리 이름
 * @param limit 가져올 포스트 개수 (기본값: 3)
 */
export async function getLatestPostsByCategory(
  category: string,
  limit: number = 3,
): Promise<Post[]> {
  // 캐시 확인
  const cacheKey = CacheKeys.latestPostsByCategory(category, limit);
  const cached = cache.get<Post[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const posts = await getPublishedPostsByCategory(category);
  const result = posts.slice(0, limit);

  // 캐시에 저장 (60초)
  cache.set(cacheKey, result, 60000);

  return result;
}

/**
 * 카테고리별 페이지네이션을 지원하는 Published 게시글 조회
 * @param category 카테고리 이름
 * @param page 페이지 번호 (1부터 시작)
 * @param pageSize 페이지당 게시글 수 (기본값: 12)
 */
export async function getPublishedPostsByCategoryPaginated(
  category: string,
  page: number = 1,
  pageSize: number = 12,
): Promise<PaginatedPosts> {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    // 전체 개수 가져오기
    const totalCount = await getTotalPostsCountByCategory(category);
    const totalPages = Math.ceil(totalCount / pageSize);

    // 유효한 페이지 번호 확인
    const currentPage = Math.max(1, Math.min(page, totalPages || 1));

    // 필요한 데이터를 가져오기 위해 순차적으로 페이지네이션
    let allResults: NotionPage[] = [];
    let cursor: string | null | undefined = undefined;
    let hasMore = true;
    const targetStartIndex = (currentPage - 1) * pageSize;
    const targetEndIndex = targetStartIndex + pageSize;

    try {
      // 목표 인덱스까지 데이터 수집
      while (hasMore && allResults.length < targetEndIndex) {
        const data = await queryNotionDatabase({
          database_id: databaseId,
          filter: {
            and: [
              {
                property: "Published",
                checkbox: {
                  equals: true,
                },
              },
              {
                property: "category",
                rich_text: {
                  equals: category,
                },
              },
            ],
          },
          sorts: [
            {
              property: "date",
              direction: "descending",
            },
          ],
          page_size: 100,
          start_cursor: cursor || undefined,
        });

        allResults = allResults.concat(data.results);
        cursor = data.next_cursor;
        hasMore = data.has_more;

        if (allResults.length >= targetEndIndex) {
          break;
        }
      }
    } catch (categoryError: unknown) {
      const errorMessage =
        categoryError instanceof Error
          ? categoryError.message
          : String(categoryError);
      if (
        errorMessage.includes("validation_error") &&
        errorMessage.includes("category")
      ) {
        // category 속성이 없으면 전체에서 필터링
        const allPosts = await getPublishedPosts();
        const filteredPosts = allPosts.filter(
          (post) => post.category && post.category === category,
        );
        const totalCountFiltered = filteredPosts.length;
        const totalPagesFiltered = Math.ceil(totalCountFiltered / pageSize);
        const currentPageFiltered = Math.max(
          1,
          Math.min(page, totalPagesFiltered || 1),
        );
        const startIndex = (currentPageFiltered - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pagePosts = filteredPosts.slice(startIndex, endIndex);

        return {
          posts: pagePosts,
          totalCount: totalCountFiltered,
          currentPage: currentPageFiltered,
          totalPages: totalPagesFiltered,
          hasNextPage: currentPageFiltered < totalPagesFiltered,
          hasPrevPage: currentPageFiltered > 1,
        };
      }
      throw categoryError;
    }

    // 현재 페이지에 해당하는 데이터만 추출
    const pageResults = allResults.slice(targetStartIndex, targetEndIndex);

    const posts: Post[] = await Promise.all(
      pageResults.map((page: NotionPage) => mapNotionPageToPost(page, true)),
    );

    return {
      posts,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Error fetching paginated posts by category from Notion:",
        error,
      );
    }
    throw error;
  }
}

/**
 * Slug로 특정 게시글을 가져옵니다
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  // 캐시 확인
  const cacheKey = CacheKeys.postBySlug(slug);
  if (cache.has(cacheKey)) {
    // 캐시에 값이 있으면 반환 (null도 포함)
    const cached = cache.get<Post | null>(cacheKey);
    return cached;
  }

  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    const data = await queryNotionDatabase({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: "slug",
            rich_text: {
              equals: slug,
            },
          },
          {
            property: "Published",
            checkbox: {
              equals: true,
            },
          },
        ],
      },
    });

    if (data.results.length === 0) {
      // 존재하지 않는 slug도 캐싱 (60초)
      cache.set(cacheKey, null, 60000);
      return null;
    }

    const page: NotionPage = data.results[0];
    const post = await mapNotionPageToPost(page, true);

    // 캐시에 저장 (60초)
    cache.set(cacheKey, post, 60000);

    return post;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching post by slug:", error);
    }
    throw error;
  }
}

/**
 * Notion API를 직접 사용하여 이미지 블록의 URL을 가져옵니다
 * @deprecated 현재 사용되지 않음 - extractImageUrlsFromPage에서 직접 처리
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getImageUrlFromNotionBlock(
  blockId: string,
): Promise<string | null> {
  try {
    const notion = getNotionClient();
    const block = await notion.blocks.retrieve({ block_id: blockId });

    // 타입 가드: block이 type 속성을 가지고 있고 'image' 타입인지 확인
    if ("type" in block && block.type === "image") {
      const imageBlock = block as NotionImageBlock;
      if (imageBlock.image) {
        // External 이미지
        if (
          imageBlock.image.type === "external" &&
          imageBlock.image.external?.url
        ) {
          return imageBlock.image.external.url;
        }
        // File 이미지
        if (imageBlock.image.type === "file" && imageBlock.image.file?.url) {
          return imageBlock.image.file.url;
        }
      }
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[getImageUrlFromNotionBlock] 이미지 블록 조회 실패 (${blockId}):`,
        error,
      );
    }
    return null;
  }
}

/**
 * Notion 페이지의 모든 블록을 가져와서 이미지 URL을 추출합니다
 */
async function extractImageUrlsFromPage(
  pageId: string,
): Promise<Map<string, string>> {
  const imageUrlMap = new Map<string, string>();

  try {
    const notion = getNotionClient();
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      });

      // 이미지 블록 찾기
      for (const block of response.results) {
        // 타입 가드: block이 type 속성을 가지고 있고 'image' 타입인지 확인
        if ("type" in block && block.type === "image") {
          const imageBlock = block as NotionImageBlock;
          let imageUrl = "";

          if (imageBlock.image) {
            // External 이미지
            if (
              imageBlock.image.type === "external" &&
              imageBlock.image.external?.url
            ) {
              imageUrl = imageBlock.image.external.url;
            }
            // File 이미지
            else if (
              imageBlock.image.type === "file" &&
              imageBlock.image.file?.url
            ) {
              imageUrl = imageBlock.image.file.url;
            }

            if (imageUrl) {
              // URL 정규화: thumbnews URL은 원본 그대로 사용 (실제로 작동함)
              // 참고: thumbnews.nateimg.co.kr/view610///news.nateimg.co.kr/... 형식도 실제로 작동함
              const normalizedUrl = imageUrl.trim();

              // 디버깅: 원본 URL 유지 확인
              if (process.env.NODE_ENV === "development") {
                console.log(
                  `[extractImageUrlsFromPage] 이미지 발견: ${block.id} -> ${normalizedUrl.substring(0, 100)}...`,
                );
              }

              imageUrlMap.set(block.id, normalizedUrl);
            }
          }
        }

        // 중첩된 블록도 확인 (예: column, callout 등)
        const blockWithChildren = block as NotionBlock;
        if (blockWithChildren.has_children) {
          const nestedImages = await extractImageUrlsFromPage(block.id);
          nestedImages.forEach((url, id) => imageUrlMap.set(id, url));
        }
      }

      cursor = response.next_cursor || undefined;
      hasMore = response.has_more;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[extractImageUrlsFromPage] 페이지 블록 조회 실패 (${pageId}):`,
        error,
      );
    }
  }

  return imageUrlMap;
}

/**
 * Notion 페이지의 콘텐츠를 마크다운으로 변환합니다
 */
export async function getPostContent(pageId: string): Promise<string> {
  // 캐시 확인
  const cacheKey = CacheKeys.postContent(pageId);
  const cached = cache.get<string>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    // 먼저 Notion API에서 직접 이미지 URL 추출
    const imageUrlMap = await extractImageUrlsFromPage(pageId);
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[getPostContent] Notion API에서 추출한 이미지: ${imageUrlMap.size}개`,
      );
    }

    const n2m = getNotionToMarkdown();
    const mdblocks = await n2m.pageToMarkdown(pageId);

    // 디버깅: 마크다운 블록에서 이미지 확인
    if (process.env.NODE_ENV === "development") {
      const imageBlocks = mdblocks.filter(
        (block: { type?: string; parent?: string }) =>
          block.type === "image" || block.parent?.includes("image"),
      );

      if (imageBlocks.length > 0) {
        console.log(
          `[getPostContent] notion-to-md에서 발견된 이미지 블록: ${imageBlocks.length}개`,
        );
      }
    }

    const mdString = n2m.toMarkdownString(mdblocks);
    let markdownContent = mdString.parent || "";

    // 디버깅: 원본 마크다운 콘텐츠 확인 (개발 환경에서만)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[getPostContent] 원본 마크다운 길이: ${markdownContent.length}자`,
      );
    }

    // 이미지 파일명만 있는 경우 (URL이 없는 경우) Notion API에서 가져온 URL로 대체
    // 패턴: 이미지 파일명만 있는 경우 (예: "news_1756856273_1543672_m_1.png")
    if (imageUrlMap.size > 0) {
      const imageUrls = Array.from(imageUrlMap.values());
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[getPostContent] 사용 가능한 이미지 URL: ${imageUrls.length}개`,
        );
        imageUrls.forEach((url, index) => {
          console.log(
            `[getPostContent] 이미지 URL ${index + 1}: ${url.substring(0, 100)}...`,
          );
        });

        // 이미 마크다운 형식인 이미지가 있는지 확인
        const existingMarkdownImages =
          markdownContent.match(/!\[.*?\]\([^\)]+\)/g) || [];
        console.log(
          `[getPostContent] 기존 마크다운 이미지: ${existingMarkdownImages.length}개`,
        );
      }

      // 이미지 파일명 패턴 찾기 (더 포괄적이고 정확한 패턴)
      // 1. 단독 줄에 있는 파일명: "news_1756856273_1543672_m_1.png"
      // 2. 앞뒤에 공백/줄바꿈이 있는 파일명
      // 3. 특정 파일명을 직접 찾기 (디버깅용)
      const specificFilename = "news_1756856273_1543672_m_1.png";
      const hasSpecificFile = markdownContent.includes(specificFilename);

      if (hasSpecificFile && process.env.NODE_ENV === "development") {
        console.log(
          `[getPostContent] 🎯 특정 파일명 발견: ${specificFilename}`,
        );
        const filenameIndex = markdownContent.indexOf(specificFilename);
        const beforeText = markdownContent.substring(
          Math.max(0, filenameIndex - 20),
          filenameIndex,
        );
        const afterText = markdownContent.substring(
          filenameIndex + specificFilename.length,
          Math.min(
            markdownContent.length,
            filenameIndex + specificFilename.length + 20,
          ),
        );
        console.log(`[getPostContent] 파일명 앞 텍스트: "${beforeText}"`);
        console.log(`[getPostContent] 파일명 뒤 텍스트: "${afterText}"`);

        // 이미 마크다운 형식인지 확인
        const isAlreadyMarkdown =
          beforeText.includes("![") ||
          beforeText.includes("](") ||
          afterText.includes("](") ||
          afterText.includes(")");

        if (!isAlreadyMarkdown && imageUrls.length > 0) {
          const imageUrl = imageUrls[0];
          const replacement = `![${specificFilename}](${imageUrl})`;
          markdownContent =
            markdownContent.substring(0, filenameIndex) +
            replacement +
            markdownContent.substring(filenameIndex + specificFilename.length);

          console.log(
            `[getPostContent] ✅ 특정 파일명 대체 성공: "${specificFilename}" -> "${imageUrl.substring(0, 80)}..."`,
          );
        } else {
          console.log(
            `[getPostContent] ⚠️ 이미 마크다운 형식이거나 URL이 없음: isMarkdown=${isAlreadyMarkdown}, hasUrl=${imageUrls.length > 0}`,
          );
        }
      } else if (hasSpecificFile) {
        // 프로덕션 환경: 로그 없이 처리만 수행
        const filenameIndex = markdownContent.indexOf(specificFilename);
        const beforeText = markdownContent.substring(
          Math.max(0, filenameIndex - 20),
          filenameIndex,
        );
        const afterText = markdownContent.substring(
          filenameIndex + specificFilename.length,
          Math.min(
            markdownContent.length,
            filenameIndex + specificFilename.length + 20,
          ),
        );

        const isAlreadyMarkdown =
          beforeText.includes("![") ||
          beforeText.includes("](") ||
          afterText.includes("](") ||
          afterText.includes(")");

        if (!isAlreadyMarkdown && imageUrls.length > 0) {
          const imageUrl = imageUrls[0];
          const replacement = `![${specificFilename}](${imageUrl})`;
          markdownContent =
            markdownContent.substring(0, filenameIndex) +
            replacement +
            markdownContent.substring(filenameIndex + specificFilename.length);
        }
      }

      // 일반적인 이미지 파일명 패턴 찾기 (다른 이미지들도 처리)
      const imageFilenamePatterns = [
        /^([a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|webp|svg))$/gm, // 단독 줄
        /(?:^|\n|\r)([a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|webp|svg))(?:\n|\r|$)/gm, // 줄 시작/끝
        /(?:^|\s)([a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|webp|svg))(?:\s|$)/g, // 공백으로 구분
      ];

      let imageIndex = hasSpecificFile ? 1 : 0; // 특정 파일명을 이미 처리했으면 인덱스 증가
      let replacementCount = hasSpecificFile ? 1 : 0;

      // 각 패턴으로 파일명 찾기 및 대체 (특정 파일명 제외)
      for (const pattern of imageFilenamePatterns) {
        const matches = Array.from(markdownContent.matchAll(pattern));

        for (const match of matches) {
          const filename = match[1] || match[0];
          const fullMatch = match[0];
          const matchIndex = match.index!;

          // 특정 파일명은 이미 처리했으므로 건너뛰기
          if (filename === specificFilename) continue;

          // 이미 마크다운 형식인지 확인
          const beforeText = markdownContent.substring(
            Math.max(0, matchIndex - 10),
            matchIndex,
          );
          const afterText = markdownContent.substring(
            matchIndex + fullMatch.length,
            Math.min(
              markdownContent.length,
              matchIndex + fullMatch.length + 10,
            ),
          );

          const isAlreadyMarkdown =
            beforeText.includes("![") ||
            beforeText.includes("](") ||
            afterText.includes("](") ||
            afterText.includes(")");

          // 이미 마크다운 형식이 아니고, 이미지 URL이 있는 경우
          if (!isAlreadyMarkdown && imageIndex < imageUrls.length) {
            const imageUrl = imageUrls[imageIndex];

            if (imageUrl) {
              // 파일명을 마크다운 이미지 형식으로 변환
              const replacement = `![${filename}](${imageUrl})`;
              markdownContent =
                markdownContent.substring(0, matchIndex) +
                replacement +
                markdownContent.substring(matchIndex + fullMatch.length);

              if (process.env.NODE_ENV === "development") {
                console.log(
                  `[getPostContent] ✅ 이미지 대체 성공: "${filename}" -> "${imageUrl.substring(0, 80)}..."`,
                );
              }
              imageIndex++;
              replacementCount++;
            }
          }
        }
      }

      if (process.env.NODE_ENV === "development") {
        if (replacementCount > 0) {
          console.log(
            `[getPostContent] ✅ 이미지 URL로 대체 완료: ${replacementCount}개`,
          );
        } else {
          console.log(
            `[getPostContent] ⚠️ 이미지 대체 실패: 파일명을 찾지 못했거나 이미 마크다운 형식임`,
          );
        }
      }
    } else if (process.env.NODE_ENV === "development") {
      console.log(
        `[getPostContent] ⚠️ 이미지 URL 맵이 비어있음: ${imageUrlMap.size}개`,
      );
    }

    // 이미지 다음에 출처 텍스트가 있는 경우, 출처를 이미지의 alt로 이동
    // 패턴 1: ![alt](url) 다음에 "출처: ..." 텍스트가 오는 경우 (빈 줄 포함)
    // 패턴 2: ![alt](url) 다음에 "< 이미지 출처 : ... >" 텍스트가 오는 경우 (빈 줄 포함)
    const imageWithSourcePattern =
      /(!\[.*?\]\([^\)]+\))(\s*\n\s*)((?:출처\s*[:：]\s*[^\n]+)|(?:<[^>]*이미지\s*출처\s*[:：]\s*[^>]+>))/g;
    let sourceReplacementCount = 0;

    markdownContent = markdownContent.replace(
      imageWithSourcePattern,
      (match, imageMarkdown, whitespace, sourceText) => {
        // 이미지 마크다운에서 alt와 url 추출
        const imageMatch = imageMarkdown.match(/!\[(.*?)\]\((.*?)\)/);
        if (imageMatch) {
          const currentAlt = imageMatch[1] || "";
          const imageUrl = imageMatch[2];

          // 출처 텍스트 추출 및 정리
          let displaySource = "";

          // 새로운 형식: "< 이미지 출처 : 머니투데이 >" - 원본 그대로 유지
          const newFormatMatch = sourceText.match(
            /<[^>]*이미지\s*출처\s*[:：]\s*[^>]+>/i,
          );
          if (newFormatMatch) {
            displaySource = sourceText.trim(); // 원본 형식 그대로 유지
          } else {
            // 기존 형식: "출처: ..." - 기존 형식 유지
            const cleanSource = sourceText
              .replace(/^출처\s*[:：]\s*/i, "")
              .trim();
            displaySource = `출처: ${cleanSource}`;
          }

          // 출처를 alt로 설정 (기존 alt가 있으면 유지하고 출처 추가)
          const newAlt = currentAlt
            ? `${currentAlt} | ${displaySource}`
            : displaySource;
          const newImageMarkdown = `![${newAlt}](${imageUrl})`;

          if (process.env.NODE_ENV === "development") {
            console.log(
              `[getPostContent] ✅ 출처를 이미지 alt로 이동: "${displaySource.substring(0, 50)}..."`,
            );
          }
          sourceReplacementCount++;

          // 이미지만 반환 (출처 텍스트와 공백은 제거)
          return newImageMarkdown;
        }
        return match;
      },
    );

    if (process.env.NODE_ENV === "development") {
      if (sourceReplacementCount > 0) {
        console.log(
          `[getPostContent] ✅ 출처를 이미지 alt로 이동 완료: ${sourceReplacementCount}개`,
        );
      }

      // 디버깅: 변환된 마크다운에서 이미지 확인
      const imagePatterns = [
        /!\[.*?\]\([^\)]+\)/g, // 마크다운 이미지
        /<img[^>]+>/g, // HTML 이미지 태그
        /https:\/\/[^\s\)]+\.(png|jpg|jpeg|gif|webp|svg)/gi, // 이미지 URL
      ];

      imagePatterns.forEach((pattern, index) => {
        const patternMatches = markdownContent.match(pattern);
        if (patternMatches && patternMatches.length > 0) {
          console.log(
            `[getPostContent] 패턴 ${index + 1} 매칭: ${patternMatches.length}개`,
          );
          console.log(`[getPostContent] 예시:`, patternMatches.slice(0, 2));
        }
      });
    }

    // 캐시에 저장 (60초)
    cache.set(cacheKey, markdownContent, 60000);

    return markdownContent;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error converting Notion page to markdown:", error);
    }
    throw error;
  }
}

/**
 * 검색어로 인사이트 글을 검색합니다
 */
export async function searchPosts(
  searchQuery: string,
  page: number = 1,
  pageSize: number = 12,
): Promise<PaginatedPosts> {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_DATABASE_ID is not defined in environment variables. " +
        "Please add NOTION_DATABASE_ID to your .env.local file.",
    );
  }

  try {
    // 먼저 모든 Published 포스트를 가져온 후 클라이언트 측에서 필터링
    const searchLower = searchQuery.toLowerCase();
    // 성능을 위해 본문 이미지 추출은 나중에 함
    const allData = await getPublishedPostsPaginated(1, 1000, false);

    // 검색어로 필터링 (제목, 설명, 카테고리, 태그에서 검색)
    const filteredPosts = allData.posts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchLower) ||
        post.metaDescription.toLowerCase().includes(searchLower) ||
        post.category?.toLowerCase().includes(searchLower) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(searchLower)),
    );

    const totalCount = filteredPosts.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages || 1));

    // 페이지네이션 적용
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagePosts = filteredPosts.slice(startIndex, endIndex);

    // 현재 페이지 포스트들에 대해 이미지가 없으면 본문에서 추출 시도
    const posts = await Promise.all(
      pagePosts.map(async (post) => {
        if (!post.featuredImage) {
          try {
            const fullContent = await getPostContent(post.id);
            const featuredImage = extractFirstImageUrl(fullContent);
            if (featuredImage) {
              return { ...post, featuredImage };
            }
          } catch {
            // 캐시 삭제 오류는 무시
          }
        }
        return post;
      }),
    );

    return {
      posts,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error searching posts:", error);
    }
    throw error;
  }
}
