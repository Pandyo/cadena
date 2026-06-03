const Parser = require('rss-parser')
const axios = require('axios')
const iconv = require('iconv-lite')
const PriceHistory = require('../models/PriceHistory')

const parser = new Parser({ timeout: 10000 })

// ============================================
// 감성 분석: 키워드 가중치
// ============================================

const SENTIMENT_KEYWORDS = {
  // 부정 강함 (-2점)
  negative_strong: [
    '해킹',
    '침해',
    '유출',
    '랜섬웨어',
    '악성코드',
    '취약점',
    '제로데이',
    '계정탈취',
    '피싱',
    '디도스',
    '변조',
    '백도어',
    '권한상승',
    '원격코드실행',
    '공급망공격',
  ],
  // 부정 약함 (-1점)
  negative_weak: [
    '사고',
    '공격',
    '경고',
    '주의',
    '긴급',
    '피해',
    '확산',
    '공개',
    '분석',
  ],
  // 긍정 강함 (+2점)
  positive_strong: [
    '패치',
    '차단',
    '탐지',
    '복구',
    '대응',
    '강화',
    '개선',
    '보완',
    '암호화',
    '인증강화',
    '점검',
    '격리',
  ],
  // 긍정 약함 (+1점)
  positive_weak: ['조치', '발표', '권고', '안내', '수정', '예방', '완료'],
}

// EUC-KR 인코딩 피드를 가져와 UTF-8로 변환 후 파싱
async function parseEucKrFeed(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 10000,
  })
  const xml = iconv.decode(Buffer.from(res.data), 'euc-kr')
  const sanitized = xml.replace(/encoding=['"]euc-kr['"]/i, 'encoding="utf-8"')
  return parser.parseString(sanitized)
}

// 보안뉴스만 사용
const RSS_FEEDS = [
  {
    url: 'http://www.boannews.com/media/news_rss.xml',
    encoding: 'euc-kr',
    name: '보안뉴스',
  },
]

// ============================================
// 기사 제목에서 감성 점수 계산
// ============================================

function calculateArticleSentiment(title) {
  if (!title) return { score: 0, keywords: [] }

  const lowerTitle = title.toLowerCase()
  let score = 0
  const detectedKeywords = []

  // 부정 강함 검사
  for (const keyword of SENTIMENT_KEYWORDS.negative_strong) {
    if (lowerTitle.includes(keyword)) {
      score -= 2
      detectedKeywords.push({
        word: keyword,
        keywordType: 'negative_strong',
        score: -2,
      })
    }
  }

  // 부정 약함 검사
  for (const keyword of SENTIMENT_KEYWORDS.negative_weak) {
    if (lowerTitle.includes(keyword)) {
      score -= 1
      detectedKeywords.push({
        word: keyword,
        keywordType: 'negative_weak',
        score: -1,
      })
    }
  }

  // 긍정 강함 검사
  for (const keyword of SENTIMENT_KEYWORDS.positive_strong) {
    if (lowerTitle.includes(keyword)) {
      score += 2
      detectedKeywords.push({
        word: keyword,
        keywordType: 'positive_strong',
        score: +2,
      })
    }
  }

  // 긍정 약함 검사
  for (const keyword of SENTIMENT_KEYWORDS.positive_weak) {
    if (lowerTitle.includes(keyword)) {
      score += 1
      detectedKeywords.push({
        word: keyword,
        keywordType: 'positive_weak',
        score: +1,
      })
    }
  }

  // 최종 판정 (-1 ~ +1은 중립)
  let sentiment = 'neutral'
  if (score >= 2) sentiment = 'positive'
  else if (score <= -2) sentiment = 'negative'

  return { score, keywords: detectedKeywords, sentiment }
}

// ============================================
// 국내 보안뉴스: 최근 10개 기사 수집
// ============================================

async function fetchLatest10Articles() {
  const results = []

  for (const { url, encoding, name } of RSS_FEEDS) {
    try {
      const feed =
        encoding === 'euc-kr'
          ? await parseEucKrFeed(url)
          : await parser.parseURL(url)

      const items = (feed.items || [])
        .slice(0, 10) // 최근 10개만
        .map((item) => ({
          title: item.title,
          link: item.link,
          pubDate: new Date(item.pubDate || item['dc:date']),
          source: name,
        }))

      results.push(...items)
      console.log(`✓ ${name}: 최근 ${items.length}개 기사 수집`)
    } catch (err) {
      console.warn(`✗ RSS fetch failed for ${url}:`, err.message)
    }
  }

  return results.sort((a, b) => b.pubDate - a.pubDate).slice(0, 10) // 최종 10개
}

// ============================================
// 감성 점수를 가격 배수로 변환
// ============================================

function calculateSentimentMultiplier(sentimentScore) {
  // 읥정/부정 점수를 단순 선형으로 변환
  // 1 = 1.1배, 2 = 1.2배, ... 10 = 2배, 11+ = 2배, 0 = 1.0배

  const absScore = Math.abs(sentimentScore)

  if (absScore === 0) {
    return 1.0 // 변동 없음
  }

  if (absScore >= 10) {
    // 10점 이상: 2배 (상승/하락)
    return sentimentScore > 0 ? 2.0 : 0.5
  }

  // 1~9점: 선형 변환
  const multiplier = 1 + absScore * 0.1 // 1.1 ~ 1.9배
  return sentimentScore > 0 ? multiplier : 1 / multiplier
}

// ============================================
// 가격 변동 계산: 5분마다 실행
// 로직: 감성 점수 10개 기사 → 배수 적용 → 1000~10000 범위 유지
// ============================================

async function updatePriceFromNews() {
  // 최근 10개 기사 수집
  const articles = await fetchLatest10Articles()

  // 기사별 감성 분석
  const articlesWithSentiment = articles.map((article) => {
    const { score, keywords, sentiment } = calculateArticleSentiment(
      article.title,
    )
    return {
      title: article.title,
      link: article.link,
      source: article.source,
      pubDate: article.pubDate,
      sentimentScore: score,
      sentiment,
      keywords,
    }
  })

  // 평균 감성 점수
  const avgSentimentScore =
    articlesWithSentiment.length > 0
      ? articlesWithSentiment.reduce((sum, a) => sum + a.sentimentScore, 0) /
        articlesWithSentiment.length
      : 0

  // 로그
  console.log(`\n📰 최근 10개 기사 감성 분석:`)
  articlesWithSentiment.forEach((article, idx) => {
    const keywordStr = article.keywords
      .map((k) => `${k.word}(${k.score})`)
      .join(', ')
    console.log(
      `   ${idx + 1}. [${article.sentiment}/${article.sentimentScore}] ${article.title.substring(0, 50)}`,
    )
  })
  console.log(`   평균 감성 점수: ${avgSentimentScore.toFixed(2)}`)

  // 현재 가격 조회
  const latest = await PriceHistory.findOne().sort({ createdAt: -1 })
  const currentPrice = latest ? latest.price : 5500 // 기본값 5500 (중간값)

  // 감성 배수 계산
  const sentimentMultiplier = calculateSentimentMultiplier(avgSentimentScore)

  // 새 가격 계산
  let newPrice = Math.round(currentPrice * sentimentMultiplier)

  // 1000 ~ 10000 범위 유지
  newPrice = Math.max(1000, Math.min(10000, newPrice))

  const changeAmount = newPrice - currentPrice
  const changePercent = ((changeAmount / currentPrice) * 100).toFixed(2)

  // 로그
  console.log(`\n💹 가격 변동:`)
  console.log(`   배수: ${sentimentMultiplier.toFixed(3)}x`)
  console.log(
    `   ${currentPrice} → ${newPrice} (${changePercent}%, ${changeAmount > 0 ? '+' : ''}${changeAmount})`,
  )

  // DB 저장
  const priceRecord = await PriceHistory.create({
    price: newPrice,
    previousPrice: currentPrice,
    changeAmount,
    changePercent: parseFloat(changePercent),
    newsCount: articles.length,
    sentimentScore: avgSentimentScore,
    articles: articlesWithSentiment,
    source: 'rss_sentiment_update',
  })

  return {
    oldPrice: currentPrice,
    newPrice,
    changeAmount,
    changePercent: parseFloat(changePercent),
    newsCount: articles.length,
    articles: articlesWithSentiment,
    sentimentScore: avgSentimentScore,
  }
}

module.exports = {
  fetchLatest10Articles,
  updatePriceFromNews,
  calculateArticleSentiment,
  calculateSentimentMultiplier,
  SENTIMENT_KEYWORDS,
}
