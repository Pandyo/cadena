const Parser = require("rss-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const PriceHistory = require("../models/PriceHistory");
const {
  MIN_ETH_PRICE,
  MAX_ETH_PRICE,
  DEFAULT_ETH_PRICE,
  normalizeToEthPrice,
  roundEthPrice,
} = require("../utils/priceScale");

// rss-parser: dc:date, content:encoded 등 확장 필드 명시적으로 수집
const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ["dc:date", "dc:date"],
      ["content:encoded", "content:encoded"],
      ["content:encodedSnippet", "content:encodedSnippet"],
      ["description", "description"],
    ],
  },
});

// ============================================
// 감성 분석: 키워드 가중치
// ============================================

const SENTIMENT_KEYWORDS = {
  negative_strong: [
    "해킹",
    "침해",
    "유출",
    "랜섬웨어",
    "악성코드",
    "취약점",
    "제로데이",
    "계정탈취",
    "피싱",
    "디도스",
    "변조",
    "백도어",
    "권한상승",
    "원격코드실행",
    "공급망공격",
  ],

  negative_weak: [
    "사고",
    "공격",
    "경고",
    "주의",
    "긴급",
    "피해",
    "확산",
    "공개",
    "분석",
  ],

  positive_strong: [
    "패치",
    "차단",
    "탐지",
    "복구",
    "대응",
    "강화",
    "개선",
    "보완",
    "암호화",
    "인증강화",
    "점검",
    "격리",
  ],

  positive_weak: ["조치", "발표", "권고", "안내", "수정", "예방", "완료"],
};

// 보안뉴스 카테고리별 RSS
// kind 파라미터: 1=취약점, 2=해킹침해, 3=악성코드, 4=산업정책, 5=인터뷰
const RSS_FEEDS = [
  {
    url: "http://www.boannews.com/media/news_rss.xml",
    encoding: "euc-kr",
    name: "보안뉴스",
  },
  {
    url: "http://www.boannews.com/media/news_rss.xml?kind=1",
    encoding: "euc-kr",
    name: "보안뉴스",
  },
  {
    url: "http://www.boannews.com/media/news_rss.xml?kind=2",
    encoding: "euc-kr",
    name: "보안뉴스",
  },
  {
    url: "http://www.boannews.com/media/news_rss.xml?kind=3",
    encoding: "euc-kr",
    name: "보안뉴스",
  },
  {
    url: "http://www.boannews.com/media/news_rss.xml?kind=4",
    encoding: "euc-kr",
    name: "보안뉴스",
  },
  {
    url: "http://www.boannews.com/media/news_rss.xml?kind=5",
    encoding: "euc-kr",
    name: "보안뉴스",
  },
];

// EUC-KR 인코딩 피드 -> UTF-8 변환 후 파싱
async function parseEucKrFeed(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CadanaBot/1.0; +http://localhost)",
    },
  });

  const xml = iconv.decode(Buffer.from(res.data), "euc-kr");
  const sanitized = xml.replace(/encoding=['"]euc-kr['"]/i, 'encoding="utf-8"');

  return parser.parseString(sanitized);
}

// pubDate 또는 dc:date 중 유효한 Date 객체 반환
function parseItemDate(item) {
  const raw = item.pubDate || item["dc:date"] || "";
  if (!raw) return null;

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeBoanNewsLink(link) {
  if (!link) return "";

  const absolute = link.startsWith("http")
    ? link
    : `https://www.boannews.com${link.startsWith("/") ? "" : "/"}${link}`;

  const idx = absolute.match(/[?&]idx=(\d+)/);
  return idx ? `https://www.boannews.com/media/view.asp?idx=${idx[1]}` : absolute;
}

function stripHtmlText(raw) {
  return (raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// 요약 텍스트 추출 및 HTML 제거
function extractSummary(item) {
  const raw =
    item.contentSnippet ||
    item["content:encodedSnippet"] ||
    item.content ||
    item["content:encoded"] ||
    item.description ||
    "";

  return stripHtmlText(raw).slice(0, 200) || null;
}

function parseScrapedDate(dateText) {
  if (!dateText) return null;

  const text = stripHtmlText(dateText);

  const koreanDate = text.match(
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*(\d{1,2}):(\d{2}))?/
  );

  if (koreanDate) {
    const [, year, month, day, hour = "0", minute = "0"] = koreanDate;

    const parsed = new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(
        2,
        "0"
      )}:${minute}:00+09:00`
    );

    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const numericDate = text.match(
    /(\d{4})[-.](\d{1,2})[-.](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/
  );

  if (!numericDate) return null;

  const [, year, month, day, hour = "0", minute = "0"] = numericDate;

  const parsed = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(
      2,
      "0"
    )}:${minute}:00+09:00`
  );

  return isNaN(parsed.getTime()) ? null : parsed;
}

// 보안뉴스 목록 페이지 스크래핑
async function scrapeBoanNewsPage(page) {
  const url = `https://www.boannews.com/media/t_list.asp?Page=${page}`;

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9",
      Referer: "https://www.boannews.com/",
    },
  });

  const html = iconv.decode(Buffer.from(res.data), "euc-kr");
  const $ = cheerio.load(html);
  const items = [];

  $(".news_list_box, .t_list_wrap .list_item, [class*='news_list']").each((_, el) => {
    const $el = $(el);
    const $link = $el.find("a[href*='view.asp']").first();
    const href = $link.attr("href") || "";
    const title = (
      $link.find("[class*='news_name'], [class*='title']").text() || $link.text()
    ).trim();

    if (!title || !href) return;

    const link = normalizeBoanNewsLink(href);

    const dateText =
      $el.find(".news_writer").text().trim() ||
      $el.find("[class*='date'], [class*='time']").text().trim() ||
      $el.text();

    const summary = stripHtmlText($el.find(".news_content").text()).slice(0, 200) || null;

    items.push({
      title,
      link,
      pubDate: parseScrapedDate(dateText),
      source: "보안뉴스",
      summary,
    });
  });

  return items;
}

// 여러 페이지 병렬 스크래핑
async function scrapeMultiplePages(totalPages = 5) {
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const results = await Promise.allSettled(
    pageNumbers.map((page) => scrapeBoanNewsPage(page))
  );

  const items = [];

  for (let i = 0; i < results.length; i += 1) {
    if (results[i].status === "rejected") {
      console.warn(`[Scraper] Page ${i + 1} failed:`, results[i].reason?.message);
      continue;
    }

    items.push(...results[i].value);
  }

  return items;
}

// ============================================
// 기사 제목에서 감성 점수 계산
// ============================================

function calculateArticleSentiment(title) {
  if (!title) return { score: 0, keywords: [], sentiment: "neutral" };

  const normalizedTitle = title.toLowerCase();
  let score = 0;
  const detectedKeywords = [];

  for (const keyword of SENTIMENT_KEYWORDS.negative_strong) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      score -= 2;
      detectedKeywords.push({
        word: keyword,
        keywordType: "negative_strong",
        score: -2,
      });
    }
  }

  for (const keyword of SENTIMENT_KEYWORDS.negative_weak) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      score -= 1;
      detectedKeywords.push({
        word: keyword,
        keywordType: "negative_weak",
        score: -1,
      });
    }
  }

  for (const keyword of SENTIMENT_KEYWORDS.positive_strong) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      score += 2;
      detectedKeywords.push({
        word: keyword,
        keywordType: "positive_strong",
        score: 2,
      });
    }
  }

  for (const keyword of SENTIMENT_KEYWORDS.positive_weak) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      score += 1;
      detectedKeywords.push({
        word: keyword,
        keywordType: "positive_weak",
        score: 1,
      });
    }
  }

  let sentiment = "neutral";
  if (score >= 2) sentiment = "positive";
  else if (score <= -2) sentiment = "negative";

  return { score, keywords: detectedKeywords, sentiment };
}

// 감성 점수를 가격 배수로 변환
function calculateSentimentMultiplier(sentimentScore) {
  const absScore = Math.abs(sentimentScore);

  if (absScore === 0) return 1.0;

  const impactMultiplier = 1 + Math.min(absScore, 10) * 0.1;
  return sentimentScore > 0 ? impactMultiplier : 1 / impactMultiplier;
}

// 오늘 기사 수를 가격 배수로 변환
function calculateNewsCountMultiplier(newsCount) {
  if (newsCount > 5) {
    return 1 + (newsCount - 5) * 0.02;
  }

  if (newsCount < 5) {
    return 1 + (newsCount - 5) * 0.01;
  }

  return 1;
}

function getKoreanDateString(date) {
  if (!date) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

// ============================================
// 국내 보안뉴스 수집
// - RSS 전체/분야별 수집
// - HTML 목록 페이지 보완
// - 링크 기준 중복 제거
// - 날짜 필터 지원
// ============================================

async function fetchSecurityNews(date) {
  const seen = new Set();
  const results = [];

  // 1) RSS 피드 병렬 수집
  const rssFetched = await Promise.allSettled(
    RSS_FEEDS.map(({ url }) => parseEucKrFeed(url))
  );

  for (let i = 0; i < rssFetched.length; i += 1) {
    const result = rssFetched[i];

    if (result.status === "rejected") {
      console.warn(`RSS failed [${RSS_FEEDS[i].url}]:`, result.reason?.message);
      continue;
    }

    const feed = result.value;

    for (const item of feed.items || []) {
      const title = (item.title || "").trim();
      const link = normalizeBoanNewsLink((item.link || "").trim());

      if (!title || !link || seen.has(link)) continue;

      seen.add(link);

      results.push({
        title,
        link,
        pubDate: parseItemDate(item),
        source: RSS_FEEDS[i].name || "보안뉴스",
        summary: extractSummary(item),
      });
    }
  }

  // 2) HTML 스크래핑 - RSS에 없는 과거 기사 보완
  try {
    const scraped = await scrapeMultiplePages(5);

    for (const item of scraped) {
      if (!item.title || !item.link || seen.has(item.link)) continue;

      seen.add(item.link);
      results.push(item);
    }
  } catch (err) {
    console.warn("[Scraper] 전체 스크래핑 실패:", err.message);
  }

  // pubDate 내림차순 정렬. null은 맨 뒤.
  results.sort((a, b) => {
    if (!a.pubDate && !b.pubDate) return 0;
    if (!a.pubDate) return 1;
    if (!b.pubDate) return -1;
    return b.pubDate.getTime() - a.pubDate.getTime();
  });

  // 날짜 필터링
  if (date) {
    return results.filter((article) => {
      if (!article.pubDate) return false;
      return getKoreanDateString(article.pubDate) === date;
    });
  }

  return results;
}

// 최신 기사만 필요할 때 사용하는 호환 함수
async function fetchLatest10Articles() {
  const articles = await fetchSecurityNews();
  const latest = articles.slice(0, 1);

  console.log(`✓ 보안뉴스: 최근 ${latest.length}개 기사 수집`);
  return latest;
}

function selectRotatingTodayArticle(todayArticles, latestPriceRecord, fallbackArticles) {
  if (todayArticles.length === 0) {
    return fallbackArticles.slice(0, 1);
  }

  const orderedTodayArticles = [...todayArticles].sort((a, b) => {
    const aTime = a.pubDate ? a.pubDate.getTime() : 0;
    const bTime = b.pubDate ? b.pubDate.getTime() : 0;
    return aTime - bTime;
  });

  const lastAnalyzedLink = latestPriceRecord?.articles?.[0]?.link;
  const lastAnalyzedIndex = orderedTodayArticles.findIndex(
    (article) => article.link === lastAnalyzedLink
  );
  const nextIndex =
    lastAnalyzedIndex >= 0 ? (lastAnalyzedIndex + 1) % orderedTodayArticles.length : 0;

  return [orderedTodayArticles[nextIndex]];
}

// ============================================
// 가격 변동 계산
// - 전체 뉴스 수집/날짜 처리/스크래핑 유지
// - 감성 분석 기반 가격 변동 유지
// - 오늘 기사 수 기반 보정도 함께 반영
// ============================================

async function updatePriceFromNews() {
  const articles = await fetchSecurityNews();

  const todayKst = getKoreanDateString(new Date());

  const todayArticles = articles.filter((article) => {
    if (!article.pubDate) return false;
    return getKoreanDateString(article.pubDate) === todayKst;
  });

  const latestPriceRecord = await PriceHistory.findOne().sort({ createdAt: -1 });
  const latestArticles = selectRotatingTodayArticle(
    todayArticles,
    latestPriceRecord,
    articles
  );

  const articlesWithSentiment = latestArticles.map((article) => {
    const { score, keywords, sentiment } = calculateArticleSentiment(article.title);

    return {
      title: article.title,
      link: article.link,
      source: article.source,
      pubDate: article.pubDate,
      summary: article.summary || null,
      sentimentScore: score,
      sentiment,
      keywords,
    };
  });

  const avgSentimentScore =
    articlesWithSentiment.length > 0
      ? articlesWithSentiment.reduce((sum, article) => sum + article.sentimentScore, 0) /
        articlesWithSentiment.length
      : 0;

  console.log("\n📰 최신 1개 기사 감성 분석:");

  articlesWithSentiment.forEach((article, idx) => {
    const keywordStr = article.keywords
      .map((keyword) => `${keyword.word}(${keyword.score})`)
      .join(", ");

    console.log(
      `   ${idx + 1}. [${article.sentiment}/${article.sentimentScore}] ${article.title.substring(
        0,
        50
      )}${keywordStr ? ` / ${keywordStr}` : ""}`
    );
  });

  console.log(`   평균 감성 점수: ${avgSentimentScore.toFixed(2)}`);
  console.log(`   오늘 기사 수: ${todayArticles.length}`);

  const currentPrice = latestPriceRecord
    ? normalizeToEthPrice(latestPriceRecord.price)
    : DEFAULT_ETH_PRICE;

  const sentimentMultiplier = calculateSentimentMultiplier(avgSentimentScore);
  const newsCountMultiplier = 1;
  const totalMultiplier = sentimentMultiplier;

  let newPrice = roundEthPrice(currentPrice * totalMultiplier);

  // 가격 범위 제한
  newPrice = roundEthPrice(Math.max(MIN_ETH_PRICE, Math.min(MAX_ETH_PRICE, newPrice)));

  const changeAmount = roundEthPrice(newPrice - currentPrice);

  const changePercent =
    currentPrice > 0 ? parseFloat(((changeAmount / currentPrice) * 100).toFixed(2)) : 0;

  console.log("\n💹 가격 변동:");
  console.log(`   감성 배수: ${sentimentMultiplier.toFixed(3)}x`);
  console.log(`   기사 수 배수: ${newsCountMultiplier.toFixed(3)}x`);
  console.log(`   최종 배수: ${totalMultiplier.toFixed(3)}x`);
  console.log(
    `   ${currentPrice} → ${newPrice} (${changePercent}%, ${
      changeAmount > 0 ? "+" : ""
    }${changeAmount})`
  );

  const priceRecord = await PriceHistory.create({
    price: newPrice,
    previousPrice: currentPrice,
    changeAmount,
    changePercent,
    newsCount: todayArticles.length,
    sentimentScore: avgSentimentScore,
    articles: articlesWithSentiment,
    source: "rss_sentiment_volume_update",
  });

  return {
    oldPrice: currentPrice,
    newPrice,
    changeAmount,
    changePercent,
    newsCount: todayArticles.length,
    totalNewsCount: articles.length,
    analyzedNewsCount: articlesWithSentiment.length,
    articles: articlesWithSentiment,
    sentimentScore: avgSentimentScore,
    sentimentMultiplier,
    newsCountMultiplier,
    totalMultiplier,
    priceRecord,
  };
}

module.exports = {
  fetchSecurityNews,
  fetchLatest10Articles,
  updatePriceFromNews,
  calculateArticleSentiment,
  calculateSentimentMultiplier,
  calculateNewsCountMultiplier,
  SENTIMENT_KEYWORDS,
};
