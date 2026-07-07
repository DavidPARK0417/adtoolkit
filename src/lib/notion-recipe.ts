import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import cache from "./cache";

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
    description?: { rich_text: NotionRichText[] };
    metaDescription?: { rich_text: NotionRichText[] };
    published?: { checkbox: boolean };
    Published?: { checkbox: boolean };
    blogPost?: { rich_text: NotionRichText[] };
    difficulty?: { select?: { name: string } | null };
    cookingtime?: unknown;
    image?: unknown;
    date?: { date: { start: string } | null };
    tags?: {
      multi_select?: { name: string; color?: string }[];
      rich_text?: NotionRichText[];
    };
    category?: { rich_text: NotionRichText[] };
    products?: {
      multi_select?: { name: string; color?: string }[];
      rich_text?: NotionRichText[];
    };
    prompt?: { rich_text: NotionRichText[] };
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

// 페이지네이션 결과 타입
export interface PaginatedRecipes {
  recipes: Recipe[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Recipe 인터페이스 정의
export interface Recipe {
  id: string;
  title: string;
  slug: string;
  metaDescription: string;
  description?: string; // description 속성도 지원
  published: boolean;
  blogPost?: string; // 선택적
  difficulty?: string;
  cookingTime?: string | number;
  servingSize?: number; // 인분
  category?: string;
  date?: string;
  tags?: string[];
  featuredImage?: string;
  image?: string; // image 속성도 지원
  products?: string[];
  prompt?: string;
}

/**
 * NotionPage 객체를 Recipe 객체로 변환하는 공통 매핑 함수입니다.
 * tags와 products를 multi_select 및 rich_text(텍스트) 양쪽 형태 모두 유연하게 매핑합니다.
 */
function mapNotionPageToRecipe(page: NotionPage, content?: string): Recipe {
  const p = page.properties;

  const blogPostContent =
    content !== undefined
      ? content
      : p.blogPost?.rich_text
        ? p.blogPost.rich_text
            .map((rt: NotionRichText) => rt.plain_text)
            .join("")
        : "";

  const description =
    p.description?.rich_text?.[0]?.plain_text ||
    p.metaDescription?.rich_text?.[0]?.plain_text ||
    "";

  let featuredImage: string | undefined = undefined;

  if (
    p.image &&
    typeof p.image === "object" &&
    p.image !== null &&
    "files" in p.image &&
    Array.isArray(p.image.files) &&
    p.image.files.length > 0
  ) {
    const file = p.image.files[0];
    if (file?.file?.url) {
      featuredImage = file.file.url;
    } else if (file?.external?.url) {
      featuredImage = file.external.url;
    }
  } else if (
    p.image &&
    typeof p.image === "object" &&
    p.image !== null &&
    "url" in p.image &&
    typeof p.image.url === "string"
  ) {
    featuredImage = p.image.url;
  }

  // featuredImage가 files/url 등 다이렉트 속성일 때 확인
  if (!featuredImage && p.featuredImage) {
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
    if (fImg && typeof fImg === "object") {
      if (
        fImg.type === "files" &&
        Array.isArray(fImg.files) &&
        fImg.files.length > 0
      ) {
        const file = fImg.files[0];
        featuredImage =
          file.type === "external" ? file.external?.url : file.file?.url;
      } else if (fImg.type === "url" && fImg.url) {
        featuredImage = fImg.url;
      }
    }
  }

  if (!featuredImage) {
    featuredImage = extractFirstImageUrl(blogPostContent);
  }

  const publishedValue = (p.published || p.Published) as
    | { checkbox?: boolean }
    | undefined;
  const isPublished = publishedValue?.checkbox ?? true;
  const difficulty = p.difficulty?.select?.name || undefined;

  let cookingTime: string | number | undefined = undefined;
  if (p.cookingtime && typeof p.cookingtime === "object") {
    const ct = p.cookingtime as {
      rich_text?: Array<{ plain_text: string }>;
      number?: number;
    };
    if (ct.rich_text?.[0]?.plain_text) {
      cookingTime = ct.rich_text[0].plain_text;
    } else if (typeof ct.number === "number") {
      cookingTime = ct.number;
    }
  }

  let servingSize: number | undefined = undefined;
  if (p.servingsize && typeof p.servingsize === "object") {
    const ss = p.servingsize as { number?: number };
    if (typeof ss.number === "number") {
      servingSize = ss.number;
    }
  }

  // 태그 매핑 (multi_select & rich_text 모두 지원)
  const tags = (() => {
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
  })();

  // 상품 매핑 (multi_select & rich_text 모두 지원)
  const products = (() => {
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
  })();

  return {
    id: page.id,
    title: p.title?.title?.[0]?.plain_text || "Untitled",
    slug: p.slug?.rich_text?.[0]?.plain_text || "",
    description,
    metaDescription:
      p.metaDescription?.rich_text?.[0]?.plain_text || description,
    published: isPublished,
    blogPost: blogPostContent || undefined,
    difficulty,
    cookingTime,
    servingSize,
    category: p.category?.rich_text?.[0]?.plain_text || undefined,
    products,
    prompt: p.prompt?.rich_text?.[0]?.plain_text || undefined,
    date: p.date?.date?.start || undefined,
    tags,
    featuredImage,
    image: featuredImage,
  };
}

/**
 * Notion Recipe 클라이언트를 생성합니다
 * 환경 변수가 없으면 에러를 throw합니다
 */
function getNotionRecipeClient(): Client {
  let apiKey = process.env.NOTION_RECIPE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NOTION_RECIPE_API_KEY is not defined in environment variables. " +
        "Please add NOTION_RECIPE_API_KEY to your .env.local file.",
    );
  }

  apiKey = apiKey.trim().replace(/^["']|["']$/g, "");

  try {
    const client = new Client({
      auth: apiKey,
    });

    if (!client || !client.databases) {
      throw new Error("Notion Recipe Client 생성 실패");
    }

    return client;
  } catch (error) {
    console.error("❌ Notion Recipe Client 생성 중 오류 발생:", error);
    throw error;
  }
}

/**
 * Notion to Markdown 변환기를 생성합니다 (Recipe용)
 */
function getNotionRecipeToMarkdown() {
  const notion = getNotionRecipeClient();
  return new NotionToMarkdown({ notionClient: notion });
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
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await delay(waitTime);
      }

      const result = await executeNotionRecipeRequest(
        request.params,
        request.retryCount,
      );
      lastRequestTime = Date.now();
      request.resolve(result);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Rate Limit (429)")
      ) {
        const maxRetries = 5;
        if (request.retryCount < maxRetries) {
          request.retryCount++;
          requestQueue.unshift(request);

          let waitTime = Math.min(
            Math.pow(2, request.retryCount) * 1000,
            60000,
          );
          const secondsMatch = error.message.match(/(\d+)초/);
          if (secondsMatch) {
            waitTime = parseInt(secondsMatch[1], 10) * 1000;
          } else {
            const msMatch = error.message.match(/(\d+)ms/);
            if (msMatch) {
              waitTime = parseInt(msMatch[1], 10);
            }
          }

          waitTime = Math.min(waitTime, 300000);
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
 * 실제 Notion Recipe API 요청을 실행하는 함수
 */
async function executeNotionRecipeRequest(
  params: {
    database_id: string;
    filter?: NotionFilter;
    sorts?: NotionSort[];
    page_size?: number;
    start_cursor?: string;
  },
  retryCount: number = 0,
): Promise<NotionQueryResponse> {
  const apiKey = process.env.NOTION_RECIPE_API_KEY?.trim().replace(
    /^["']|["']$/g,
    "",
  );

  if (!apiKey) {
    throw new Error("NOTION_RECIPE_API_KEY is not defined");
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

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const errorText = await response.text();

    let waitTime: number;
    if (retryAfter) {
      waitTime = parseInt(retryAfter, 10) * 1000;
    } else {
      waitTime = Math.min(Math.pow(2, retryCount) * 1000, 60000);
    }

    throw new Error(
      `Notion API Rate Limit (429): ${waitTime / 1000}초 후 재시도 필요. ${errorText}`,
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Notion Recipe API 오류 (${response.status}): ${errorText}`,
    );
  }

  return await response.json();
}

/**
 * Notion Recipe API를 직접 호출하여 데이터베이스를 쿼리합니다
 */
async function queryNotionRecipeDatabase(
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
    requestQueue.push({
      resolve,
      reject,
      params,
      retryCount,
    });

    processRequestQueue().catch((error) => {
      console.error("요청 큐 처리 중 오류:", error);
    });
  });
}

/**
 * 마크다운 텍스트에서 첫 번째 이미지 URL을 추출합니다
 */
function extractFirstImageUrl(markdown: string): string | undefined {
  if (!markdown) return undefined;

  const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i;
  const markdownMatch = markdown.match(markdownImageRegex);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1];
  }

  const htmlImageRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i;
  const htmlMatch = markdown.match(htmlImageRegex);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }

  const urlImageRegex = /(https?:\/\/[^\s\)]+\.(jpg|jpeg|png|gif|webp|svg))/i;
  const urlMatch = markdown.match(urlImageRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  return undefined;
}

/**
 * Published된 레시피의 총 개수를 가져옵니다
 */
export async function getTotalRecipesCount(): Promise<number> {
  const cacheKey = `recipe_total_count`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const databaseId = process.env.NOTION_RECIPE_DATABASE_ID;
  const publishedPropertyName =
    process.env.NOTION_RECIPE_PUBLISHED_PROPERTY || "published";

  if (!databaseId) {
    throw new Error(
      "NOTION_RECIPE_DATABASE_ID is not defined in environment variables.",
    );
  }

  try {
    // Published 속성이 있는지 확인하기 위해 필터를 사용해 시도
    let data;
    try {
      data = await queryNotionRecipeDatabase({
        database_id: databaseId,
        filter: {
          property: publishedPropertyName,
          checkbox: {
            equals: true,
          },
        },
        page_size: 100,
      });
    } catch (filterError) {
      // Published 속성이 없으면 필터 없이 모든 레시피 가져오기
      if (
        filterError instanceof Error &&
        filterError.message.includes("Could not find property")
      ) {
        console.warn(
          `⚠️ "${publishedPropertyName}" 속성을 찾을 수 없습니다. 모든 레시피를 가져옵니다.`,
        );
        data = await queryNotionRecipeDatabase({
          database_id: databaseId,
          page_size: 100,
        });
      } else {
        throw filterError;
      }
    }

    let totalCount = data.results.length;
    let cursor = data.next_cursor;

    while (cursor && data.has_more) {
      let nextData;
      try {
        nextData = await queryNotionRecipeDatabase({
          database_id: databaseId,
          filter: {
            property: publishedPropertyName,
            checkbox: {
              equals: true,
            },
          },
          page_size: 100,
          start_cursor: cursor,
        });
      } catch (filterError) {
        // Published 속성이 없으면 필터 없이 가져오기
        if (
          filterError instanceof Error &&
          filterError.message.includes("Could not find property")
        ) {
          nextData = await queryNotionRecipeDatabase({
            database_id: databaseId,
            page_size: 100,
            start_cursor: cursor,
          });
        } else {
          throw filterError;
        }
      }
      totalCount += nextData.results.length;
      cursor = nextData.next_cursor;
    }

    cache.set(cacheKey, totalCount, 60000);
    return totalCount;
  } catch (error) {
    console.error("Error fetching total recipes count:", error);
    throw error;
  }
}

/**
 * 페이지네이션을 지원하는 Published 레시피 조회
 */
export async function getPublishedRecipesPaginated(
  page: number = 1,
  pageSize: number = 12,
): Promise<PaginatedRecipes> {
  const databaseId = process.env.NOTION_RECIPE_DATABASE_ID;
  const publishedPropertyName =
    process.env.NOTION_RECIPE_PUBLISHED_PROPERTY || "published";

  if (!databaseId) {
    throw new Error(
      "NOTION_RECIPE_DATABASE_ID is not defined in environment variables.",
    );
  }

  try {
    const totalCount = await getTotalRecipesCount();
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages || 1));

    let allResults: NotionPage[] = [];
    let cursor: string | null | undefined = undefined;
    let hasMore = true;
    const targetStartIndex = (currentPage - 1) * pageSize;
    const targetEndIndex = targetStartIndex + pageSize;
    let useFilterVar = true; // 필터 사용 여부

    while (hasMore && allResults.length < targetEndIndex) {
      let data;
      try {
        data = await queryNotionRecipeDatabase({
          database_id: databaseId,
          filter: useFilterVar
            ? {
                property: publishedPropertyName,
                checkbox: {
                  equals: true,
                },
              }
            : undefined,
          sorts: [
            {
              property: "date",
              direction: "descending",
            },
          ],
          page_size: 100,
          start_cursor: cursor || undefined,
        });
      } catch (filterError) {
        // Published 속성이 없으면 필터 없이 가져오기
        if (
          filterError instanceof Error &&
          filterError.message.includes("Could not find property")
        ) {
          console.warn(
            `⚠️ "${publishedPropertyName}" 속성을 찾을 수 없습니다. 필터 없이 모든 레시피를 가져옵니다.`,
          );
          useFilterVar = false;
          data = await queryNotionRecipeDatabase({
            database_id: databaseId,
            sorts: [
              {
                property: "date",
                direction: "descending",
              },
            ],
            page_size: 100,
            start_cursor: cursor || undefined,
          });
        } else {
          throw filterError;
        }
      }

      allResults = allResults.concat(data.results);
      cursor = data.next_cursor;
      hasMore = data.has_more;

      if (allResults.length >= targetEndIndex) {
        break;
      }
    }

    const pageResults = allResults.slice(targetStartIndex, targetEndIndex);

    // 1단계: 먼저 기본 정보만 빠르게 가져오기 (이미지 추출 없이)
    const recipesWithoutImages: Recipe[] = pageResults.map((page: NotionPage) =>
      mapNotionPageToRecipe(page),
    );

    // 2단계: 상단 2개 항목의 이미지를 먼저 가져오기 (우선순위)
    const priorityRecipes = recipesWithoutImages.slice(0, 2);
    const priorityImagePromises = priorityRecipes.map(async (recipe) => {
      // 이미 이미지가 있으면 스킵
      if (recipe.featuredImage) {
        return recipe;
      }

      try {
        const fullContent = await getRecipeContent(recipe.id);
        const featuredImage = extractFirstImageUrl(fullContent);
        return { ...recipe, featuredImage, image: featuredImage };
      } catch {
        // 이미지 추출 실패는 무시
        return recipe;
      }
    });

    // 상단 2개 항목의 이미지 로드 완료 대기
    const recipesWithPriorityImages = await Promise.all(priorityImagePromises);

    // 3단계: 나머지 항목의 이미지를 점진적으로 로드 (백그라운드)
    const remainingRecipes = recipesWithoutImages.slice(2);
    const remainingImagePromises = remainingRecipes.map(async (recipe) => {
      // 이미 이미지가 있으면 스킵
      if (recipe.featuredImage) {
        return recipe;
      }

      try {
        const fullContent = await getRecipeContent(recipe.id);
        const featuredImage = extractFirstImageUrl(fullContent);
        return { ...recipe, featuredImage, image: featuredImage };
      } catch {
        // 이미지 추출 실패는 무시
        return recipe;
      }
    });

    // 나머지 항목의 이미지는 백그라운드에서 로드 (기다리지 않음)
    // 하지만 결과를 반환하기 위해 Promise.all로 처리
    const recipesWithRemainingImages = await Promise.all(
      remainingImagePromises,
    );

    // 최종 결과: 우선순위 항목 + 나머지 항목
    const recipes = [
      ...recipesWithPriorityImages,
      ...recipesWithRemainingImages,
    ];

    return {
      recipes,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  } catch (error) {
    console.error("Error fetching paginated recipes from Notion:", error);
    throw error;
  }
}

/**
 * 메인 페이지 전용: 캐시 없이 최신 레시피 N개 가져오기
 * @param limit 가져올 레시피 개수 (기본값: 3)
 * @returns 최신 레시피 배열
 */
export async function getLatestRecipes(limit: number = 3): Promise<Recipe[]> {
  const databaseId = process.env.NOTION_RECIPE_DATABASE_ID;
  const publishedPropertyName =
    process.env.NOTION_RECIPE_PUBLISHED_PROPERTY || "published";

  if (!databaseId) {
    throw new Error(
      "NOTION_RECIPE_DATABASE_ID is not defined in environment variables.",
    );
  }

  try {
    let data;

    try {
      // Published 속성이 있는 경우 필터 사용
      data = await queryNotionRecipeDatabase({
        database_id: databaseId,
        filter: {
          property: publishedPropertyName,
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
    } catch (filterError) {
      // Published 속성이 없으면 필터 없이 가져오기
      if (
        filterError instanceof Error &&
        filterError.message.includes("Could not find property")
      ) {
        data = await queryNotionRecipeDatabase({
          database_id: databaseId,
          sorts: [
            {
              property: "date",
              direction: "descending",
            },
          ],
          page_size: limit,
        });
      } else {
        throw filterError;
      }
    }

    const recipesWithoutImages: Recipe[] = data.results.map(
      (page: NotionPage) => mapNotionPageToRecipe(page),
    );

    const recipesWithImagesPromises = recipesWithoutImages.map(
      async (recipe) => {
        // 이미 이미지가 있으면 스킵
        if (recipe.featuredImage) {
          console.log(
            `[getLatestRecipes] ${recipe.title} already has featuredImage: ${recipe.featuredImage}`,
          );
          return recipe;
        }

        try {
          console.log(
            `[getLatestRecipes] fetching full content for ${recipe.title}...`,
          );
          const fullContent = await getRecipeContent(recipe.id);
          const featuredImage = extractFirstImageUrl(fullContent);
          console.log(
            `[getLatestRecipes] ${recipe.title} extracting image from content: ${featuredImage}`,
          );
          return { ...recipe, featuredImage, image: featuredImage };
        } catch (error) {
          console.error(
            `[getLatestRecipes] Failed to extract image for ${recipe.title}:`,
            error,
          );
          // 이미지 추출 실패는 무시
          return recipe;
        }
      },
    );

    const recipes = await Promise.all(recipesWithImagesPromises);

    return recipes;
  } catch (error) {
    console.error("Error fetching latest recipes from Notion:", error);
    throw error;
  }
}

/**
 * Sitemap 전용: 모든 발행된 레시피를 가져옵니다 (페이지네이션 없이)
 * @returns 모든 발행된 레시피 배열
 */
export async function getAllPublishedRecipes(): Promise<Recipe[]> {
  const databaseId = process.env.NOTION_RECIPE_DATABASE_ID;
  const publishedPropertyName =
    process.env.NOTION_RECIPE_PUBLISHED_PROPERTY || "published";

  if (!databaseId) {
    throw new Error(
      "NOTION_RECIPE_DATABASE_ID is not defined in environment variables.",
    );
  }

  try {
    let allRecipes: Recipe[] = [];
    let cursor: string | null | undefined = undefined;
    let hasMore = true;
    let useFilter = true;

    // 모든 페이지를 가져올 때까지 반복
    while (hasMore) {
      let data;

      try {
        // Published 속성이 있는 경우 필터 사용
        data = await queryNotionRecipeDatabase({
          database_id: databaseId,
          filter: {
            property: publishedPropertyName,
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
          page_size: 100, // 한 번에 100개씩 가져오기
          start_cursor: cursor || undefined,
        });
      } catch (filterError) {
        // Published 속성이 없으면 필터 없이 가져오기
        if (
          useFilter &&
          filterError instanceof Error &&
          filterError.message.includes("Could not find property")
        ) {
          useFilter = false;
          data = await queryNotionRecipeDatabase({
            database_id: databaseId,
            sorts: [
              {
                property: "date",
                direction: "descending",
              },
            ],
            page_size: 100,
            start_cursor: cursor || undefined,
          });
        } else {
          throw filterError;
        }
      }

      const recipes: Recipe[] = data.results.map((page: NotionPage) =>
        mapNotionPageToRecipe(page),
      );

      allRecipes = [...allRecipes, ...recipes];

      // 다음 페이지가 있는지 확인
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    return allRecipes;
  } catch (error) {
    console.error("레시피 조회 실패:", error);
    return [];
  }
}

/**
 * Slug로 특정 레시피를 가져옵니다
 */
export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const cacheKey = `recipe_slug_${slug}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get<Recipe | null>(cacheKey);
    return cached;
  }

  const databaseId = process.env.NOTION_RECIPE_DATABASE_ID;
  const publishedPropertyName =
    process.env.NOTION_RECIPE_PUBLISHED_PROPERTY || "published";

  if (!databaseId) {
    throw new Error(
      "NOTION_RECIPE_DATABASE_ID is not defined in environment variables.",
    );
  }

  try {
    let data;
    try {
      // Published 속성이 있는 경우 필터 사용
      data = await queryNotionRecipeDatabase({
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
              property: publishedPropertyName,
              checkbox: {
                equals: true,
              },
            },
          ],
        },
      });
    } catch (filterError) {
      // Published 속성이 없으면 slug만으로 필터링
      if (
        filterError instanceof Error &&
        filterError.message.includes("Could not find property")
      ) {
        data = await queryNotionRecipeDatabase({
          database_id: databaseId,
          filter: {
            property: "slug",
            rich_text: {
              equals: slug,
            },
          },
        });
      } else {
        throw filterError;
      }
    }

    if (data.results.length === 0) {
      cache.set(cacheKey, null, 60000);
      return null;
    }

    const page: NotionPage = data.results[0];
    const recipe = mapNotionPageToRecipe(page);

    cache.set(cacheKey, recipe, 60000);
    return recipe;
  } catch (error) {
    console.error("Error fetching recipe by slug:", error);
    throw error;
  }
}

/**
 * Notion 레시피 페이지의 콘텐츠를 마크다운으로 변환합니다
 */
export async function getRecipeContent(pageId: string): Promise<string> {
  const cacheKey = `recipe_content_${pageId}`;
  const cached = cache.get<string>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const n2m = getNotionRecipeToMarkdown();
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);
    const markdownContent = mdString.parent || "";

    cache.set(cacheKey, markdownContent, 60000);
    return markdownContent;
  } catch (error) {
    console.error("Error converting Notion recipe page to markdown:", error);
    throw error;
  }
}

/**
 * 검색어로 레시피를 검색합니다
 */
export async function searchRecipes(
  query: string,
  page: number = 1,
  pageSize: number = 12,
): Promise<PaginatedRecipes> {
  const databaseId = process.env.NOTION_RECIPE_DATABASE_ID;

  if (!databaseId) {
    throw new Error(
      "NOTION_RECIPE_DATABASE_ID is not defined in environment variables.",
    );
  }

  try {
    // 먼저 모든 Published 레시피를 가져온 후 클라이언트 측에서 필터링
    // (Notion API의 검색 기능은 복잡하므로 간단하게 구현)
    const allData = await getPublishedRecipesPaginated(1, 1000);

    const searchLower = query.toLowerCase();
    const filteredRecipes = allData.recipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(searchLower) ||
        recipe.metaDescription.toLowerCase().includes(searchLower) ||
        recipe.category?.toLowerCase().includes(searchLower) ||
        recipe.tags?.some((tag) => tag.toLowerCase().includes(searchLower)),
    );

    const totalCount = filteredRecipes.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages || 1));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageRecipes = filteredRecipes.slice(startIndex, endIndex);

    return {
      recipes: pageRecipes,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  } catch (error) {
    console.error("Error searching recipes:", error);
    throw error;
  }
}
