const Parser = require("rss-parser");
const axios = require("axios");
const iconv = require("iconv-lite");
const PriceHistory = require("../models/PriceHistory");

const parser = new Parser({ timeout: 10000 });

// EUC-KR 인코딩 피드를 가져와 UTF-8로 변환 후 파싱
async function parseEucKrFeed(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
  const xml = iconv.decode(Buffer.from(res.data), "euc-kr");
  const sanitized = xml.replace(/encoding=['"]euc-kr['"]/i, 'encoding="utf-8"');
  return parser.parseString(sanitized);
}

const RSS_FEEDS = [
  { url: "https://feeds.feedburner.com/TheHackersNews", encoding: "utf-8" },
  { url: "https://www.bleepingcomputer.com/feed/", encoding: "utf-8" },
  { url: "http://www.boannews.com/media/news_rss.xml", encoding: "euc-kr" },
];

async function fetchSecurityNews() {
  const results = [];
  for (const { url, encoding } of RSS_FEEDS) {
    try {
      const feed = encoding === "euc-kr"
        ? await parseEucKrFeed(url)
        : await parser.parseURL(url);
      const items = (feed.items || []).slice(0, 10).map((item) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || item["dc:date"],
        source: feed.title || "보안뉴스",
      }));
      results.push(...items);
    } catch (err) {
      console.warn(`RSS fetch failed for ${url}:`, err.message);
    }
  }
  return results.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
}

async function updatePriceFromNews() {
  const articles = await fetchSecurityNews();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayArticles = articles.filter((a) => new Date(a.pubDate) >= today);
  const newsCount = todayArticles.length;

  const latest = await PriceHistory.findOne().sort({ createdAt: -1 });
  const basePrice = latest ? latest.price : Number(process.env.CDA_BASE_PRICE) || 1000;

  // Price adjustment: +2% per article above 5, -1% per article below 5
  let adjustment = 0;
  if (newsCount > 5) {
    adjustment = (newsCount - 5) * 0.02;
  } else if (newsCount < 5) {
    adjustment = (newsCount - 5) * 0.01;
  }

  const newPrice = Math.max(100, Math.round(basePrice * (1 + adjustment)));

  await PriceHistory.create({ price: newPrice, newsCount, source: "rss_crawl" });

  console.log(`Price updated: ${basePrice} → ${newPrice} (${newsCount} articles today)`);
  return { oldPrice: basePrice, newPrice, newsCount, adjustment };
}

module.exports = { fetchSecurityNews, updatePriceFromNews };
