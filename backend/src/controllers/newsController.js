const { fetchSecurityNews, updatePriceFromNews } = require("../services/newsService");

exports.getNews = async (req, res) => {
  try {
    const articles = await fetchSecurityNews(req.query.date || null);
    const result = req.query.date ? articles : articles.slice(0, 30);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyCount = async (req, res) => {
  try {
    const { year, month } = req.query;
    const articles = await fetchSecurityNews();
    const prefix = `${year}-${month}`;
    const counts = {};

    for (const article of articles) {
      if (!article.pubDate) continue;
      const dateStr = new Date(article.pubDate).toLocaleDateString("en-CA", {
        timeZone: "Asia/Seoul",
      });

      if (dateStr.startsWith(prefix)) {
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    }

    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.triggerPriceUpdate = async (req, res) => {
  try {
    const result = await updatePriceFromNews();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};