const { fetchSecurityNews, updatePriceFromNews } = require("../services/newsService");

exports.getNews = async (req, res) => {
  try {
    const articles = await fetchSecurityNews(req.query.date);
    res.json(articles);
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