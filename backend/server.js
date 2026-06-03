require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const { updatePriceFromNews } = require("./src/services/newsService");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cadana")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/trade", require("./src/routes/trade"));
app.use("/api/location", require("./src/routes/location"));
app.use("/api/news", require("./src/routes/news"));
app.use("/api/price", require("./src/routes/price"));

// Daily price update at midnight KST (15:00 UTC)
cron.schedule("0 15 * * *", async () => {
  console.log("Running daily news price update...");
  await updatePriceFromNews();
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => console.log(`Cadana backend running on port ${PORT}`));

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\n[PORT ERROR] Port ${PORT} is already in use.`);
    console.error("이미 해당 포트를 사용하는 프로세스가 있습니다.");
    console.error(`확인 명령어: netstat -ano | findstr :${PORT}`);
    console.error("종료 명령어: taskkill /PID PID번호 /F\n");
    process.exit(1);
  }

  console.error("[SERVER ERROR]", error);
  process.exit(1);
});
