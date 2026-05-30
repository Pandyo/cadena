const cron = require("node-cron");
const Parser = require("rss-parser");
const axios = require("axios");

const parser = new Parser({ timeout: 10000 });
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

const FEEDS = [
  "https://feeds.feedburner.com/TheHackersNews",
  "https://www.bleepingcomputer.com/feed/",
];

async function run() {
  console.log("[Crawler] Fetching security news...");
  try {
    const res = await axios.post(`${BACKEND_URL}/api/news/update-price`);
    console.log("[Crawler] Price update result:", res.data);
  } catch (err) {
    console.error("[Crawler] Error:", err.message);
  }
}

// Run once immediately, then every day at midnight
run();
cron.schedule("0 0 * * *", run);
console.log("[Crawler] Cron scheduled: daily at midnight");
