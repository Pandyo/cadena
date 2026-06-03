const MIN_ETH_PRICE = 0.0005;
const MAX_ETH_PRICE = 0.001;
const DEFAULT_ETH_PRICE = MIN_ETH_PRICE;

function roundEthPrice(price) {
  return Number(price.toFixed(7));
}

function krwScaleToEth(price) {
  const ethPrice = MIN_ETH_PRICE + ((price - 1000) / 9000) * 0.0005;
  return roundEthPrice(Math.max(MIN_ETH_PRICE, Math.min(MAX_ETH_PRICE, ethPrice)));
}

function normalizeToEthPrice(price) {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return roundEthPrice(DEFAULT_ETH_PRICE);
  }

  if (numericPrice >= 100) {
    return krwScaleToEth(numericPrice);
  }

  return roundEthPrice(Math.max(MIN_ETH_PRICE, Math.min(MAX_ETH_PRICE, numericPrice)));
}

module.exports = {
  MIN_ETH_PRICE,
  MAX_ETH_PRICE,
  DEFAULT_ETH_PRICE,
  roundEthPrice,
  normalizeToEthPrice,
};
