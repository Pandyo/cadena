const mongoose = require('mongoose')

const priceHistorySchema = new mongoose.Schema(
  {
    // 기본 가격 정보
    price: { type: Number, required: true },
    previousPrice: { type: Number, default: null },
    changeAmount: { type: Number, default: 0 },
    changePercent: { type: Number, default: 0 },

    // 뉴스 분석 데이터
    newsCount: { type: Number, default: 0 },
    sentimentScore: { type: Number, default: 0 },

    // 분석된 기사 목록
    articles: [
      {
        title: String,
        link: String,
        source: String,
        pubDate: Date,
        sentimentScore: Number,
        sentiment: {
          type: String,
          enum: ['positive', 'neutral', 'negative'],
        },
        keywords: [
          {
            word: { type: String },
            keywordType: { type: String },
            score: { type: Number },
            _id: false,
          },
        ],
      },
    ],

    // 메타데이터
    source: { type: String, default: 'manual' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

module.exports = mongoose.model('PriceHistory', priceHistorySchema)
