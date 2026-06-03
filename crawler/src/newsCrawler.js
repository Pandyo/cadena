const cron = require("node-cron");
const axios = require("axios");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

async function run() {
  console.log("[Crawler] Updating price from 보안뉴스 articles...");
  try {
    const res = await axios.post(`${BACKEND_URL}/api/news/update-price`);
    console.log("[Crawler] Price update result:", res.data);
  } catch (err) {
    console.error("[Crawler] Error:", err.message);
  }
}

// Run once immediately, then update the 보안뉴스-based price every day at midnight.
run();
cron.schedule("0 0 * * *", run);
console.log("[Crawler] Cron scheduled: daily at midnight");