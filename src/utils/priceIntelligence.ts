import { VendorItemPriceHistory } from '../types';

const PRICE_EPSILON = 0.005;
export const PRICE_WATCH_THRESHOLD_PERCENT = 10;
export const EXTREME_PRICE_CHANGE_THRESHOLD_PERCENT = 25;
export const RECENT_RANGE_WINDOW_SIZE = 5;
export const MIN_RECENT_RANGE_ENTRIES = 3;

export type PriceStatus = 'Up from last' | 'Down from last' | 'Same as last' | 'No history yet';
export type PriceWatchDirection = 'up' | 'down' | 'neutral';
export type RecentRangeStatus = 'Above recent range' | 'Below recent range' | 'Within recent range';

export interface PriceWatchResult {
  shouldShow: boolean;
  direction: PriceWatchDirection;
  percentDelta: number | null;
  amountDelta: number | null;
  label: string | null;
  reason: string | null;
  latest: VendorItemPriceHistory | null;
}

export interface ExtremePriceChangeHint {
  shouldShow: boolean;
  percentDelta: number | null;
  amountDelta: number | null;
  label: string | null;
  reason: string | null;
  latest: VendorItemPriceHistory | null;
}

export interface VendorItemRecentRange {
  shouldShow: boolean;
  status: RecentRangeStatus | null;
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
  entries: VendorItemPriceHistory[];
  reason: string | null;
}

const byNewestFirst = (a: VendorItemPriceHistory, b: VendorItemPriceHistory) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

export const getVendorItemPriceHistory = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string
) => {
  if (!vendorId || !itemId) return [];

  return priceHistory
    .filter(entry => entry.vendorId === vendorId && entry.itemId === itemId)
    .sort(byNewestFirst);
};

export const getLatestVendorItemPrice = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string
) => getVendorItemPriceHistory(priceHistory, vendorId, itemId)[0];

export const getPreviousVendorItemPrice = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string,
  beforeDate?: string
) => {
  const history = getVendorItemPriceHistory(priceHistory, vendorId, itemId);
  if (!beforeDate) return history[1];

  const beforeTime = new Date(beforeDate).getTime();
  return history.find(entry => new Date(entry.date).getTime() < beforeTime);
};

export const getVendorItemPriceDelta = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string,
  comparePrice?: number
) => {
  const latestPrice = getLatestVendorItemPrice(priceHistory, vendorId, itemId);
  if (!latestPrice) return undefined;

  const baseline = comparePrice === undefined
    ? getPreviousVendorItemPrice(priceHistory, vendorId, itemId)
    : latestPrice;

  if (!baseline) return undefined;

  const priceToCompare = comparePrice ?? latestPrice.price;
  const amount = priceToCompare - baseline.price;
  const percent = Math.abs(baseline.price) > PRICE_EPSILON
    ? (amount / baseline.price) * 100
    : undefined;

  return {
    amount: Math.abs(amount) < PRICE_EPSILON ? 0 : amount,
    percent: percent !== undefined && Math.abs(percent) < PRICE_EPSILON ? 0 : percent,
    baseline,
    latest: latestPrice,
  };
};

export const getVendorItemPriceStatus = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string,
  comparePrice?: number
): PriceStatus => {
  const latestPrice = getLatestVendorItemPrice(priceHistory, vendorId, itemId);
  if (!latestPrice) return 'No history yet';

  const delta = getVendorItemPriceDelta(priceHistory, vendorId, itemId, comparePrice);
  if (!delta || delta.amount === 0) return 'Same as last';

  return delta.amount > 0 ? 'Up from last' : 'Down from last';
};

export const formatPriceDelta = (delta: ReturnType<typeof getVendorItemPriceDelta>) => {
  if (!delta) return undefined;
  if (delta.amount === 0) return '$0.00';

  const sign = delta.amount > 0 ? '+' : '-';
  const amount = `$${Math.abs(delta.amount).toFixed(2)}`;
  const percent = delta.percent === undefined ? '' : ` (${sign}${Math.abs(delta.percent).toFixed(1)}%)`;

  return `${sign}${amount}${percent}`;
};

export const isMeaningfulPriceChange = (
  percentDelta?: number,
  amountDelta?: number,
  thresholdPercent = PRICE_WATCH_THRESHOLD_PERCENT
) => {
  if (percentDelta === undefined || amountDelta === undefined) return false;
  if (Math.abs(amountDelta) < PRICE_EPSILON) return false;

  return Math.abs(percentDelta) >= thresholdPercent;
};

export const getVendorItemRecentAverage = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string,
  limit = 5
) => {
  const recentHistory = getVendorItemPriceHistory(priceHistory, vendorId, itemId).slice(0, limit);
  if (recentHistory.length === 0) return undefined;

  const total = recentHistory.reduce((sum, entry) => sum + entry.price, 0);
  return total / recentHistory.length;
};

export const getVendorItemRecentRange = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string,
  currentPrice?: number,
  windowSize = RECENT_RANGE_WINDOW_SIZE,
  minEntries = MIN_RECENT_RANGE_ENTRIES
): VendorItemRecentRange => {
  const entries = getVendorItemPriceHistory(priceHistory, vendorId, itemId).slice(0, windowSize);

  if (entries.length < minEntries) {
    return {
      shouldShow: false,
      status: null,
      average: null,
      min: null,
      max: null,
      count: entries.length,
      entries,
      reason: `Needs at least ${minEntries} price entries for recent range.`,
    };
  }

  const prices = entries.map(entry => entry.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  let status: RecentRangeStatus | null = null;

  if (currentPrice !== undefined && currentPrice > 0) {
    if (currentPrice > max + PRICE_EPSILON) {
      status = 'Above recent range';
    } else if (currentPrice < min - PRICE_EPSILON) {
      status = 'Below recent range';
    } else {
      status = 'Within recent range';
    }
  }

  return {
    shouldShow: currentPrice !== undefined && currentPrice > 0,
    status,
    average,
    min,
    max,
    count: entries.length,
    entries,
    reason: null,
  };
};

export const getVendorItemPriceWatchLabel = (percentDelta: number, direction: PriceWatchDirection) => {
  if (direction === 'neutral') return null;

  const sign = direction === 'up' ? '+' : '-';
  return `Price watch: ${sign}${Math.abs(percentDelta).toFixed(0)}% vs last`;
};

export const getVendorItemPriceWatch = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string,
  currentPrice?: number,
  thresholdPercent = PRICE_WATCH_THRESHOLD_PERCENT
): PriceWatchResult => {
  const latest = getLatestVendorItemPrice(priceHistory, vendorId, itemId);

  if (!latest || currentPrice === undefined || currentPrice <= 0) {
    return {
      shouldShow: false,
      direction: 'neutral',
      percentDelta: null,
      amountDelta: null,
      label: null,
      reason: latest ? 'Enter a current price to compare against history.' : 'No usable history yet.',
      latest: latest ?? null,
    };
  }

  const delta = getVendorItemPriceDelta(priceHistory, vendorId, itemId, currentPrice);

  if (!delta || delta.percent === undefined || !isMeaningfulPriceChange(delta.percent, delta.amount, thresholdPercent)) {
    return {
      shouldShow: false,
      direction: 'neutral',
      percentDelta: delta?.percent ?? null,
      amountDelta: delta?.amount ?? null,
      label: null,
      reason: 'Movement is below the price watch threshold.',
      latest,
    };
  }

  const direction: PriceWatchDirection = delta.amount > 0 ? 'up' : 'down';

  return {
    shouldShow: true,
    direction,
    percentDelta: delta.percent,
    amountDelta: delta.amount,
    label: getVendorItemPriceWatchLabel(delta.percent, direction),
    reason: direction === 'up' ? 'Above recent price memory.' : 'Below recent price memory.',
    latest,
  };
};

export const isExtremePriceChange = (
  percentDelta?: number,
  amountDelta?: number,
  thresholdPercent = EXTREME_PRICE_CHANGE_THRESHOLD_PERCENT
) => {
  if (percentDelta === undefined || amountDelta === undefined) return false;
  if (Math.abs(amountDelta) < PRICE_EPSILON) return false;

  return Math.abs(percentDelta) >= thresholdPercent;
};

export const getVendorItemExtremeChangeHint = (
  priceHistory: VendorItemPriceHistory[],
  vendorId?: string,
  itemId?: string,
  currentPrice?: number,
  thresholdPercent = EXTREME_PRICE_CHANGE_THRESHOLD_PERCENT
): ExtremePriceChangeHint => {
  const latest = getLatestVendorItemPrice(priceHistory, vendorId, itemId);

  if (!latest || currentPrice === undefined || currentPrice <= 0) {
    return {
      shouldShow: false,
      percentDelta: null,
      amountDelta: null,
      label: null,
      reason: latest ? 'Enter a current price to compare against history.' : 'No usable history yet.',
      latest: latest ?? null,
    };
  }

  const delta = getVendorItemPriceDelta(priceHistory, vendorId, itemId, currentPrice);

  if (!delta || delta.percent === undefined || !isExtremePriceChange(delta.percent, delta.amount, thresholdPercent)) {
    return {
      shouldShow: false,
      percentDelta: delta?.percent ?? null,
      amountDelta: delta?.amount ?? null,
      label: null,
      reason: 'Change is below the extreme review threshold.',
      latest,
    };
  }

  const direction = delta.amount > 0 ? 'above' : 'below';

  return {
    shouldShow: true,
    percentDelta: delta.percent,
    amountDelta: delta.amount,
    label: 'Large change from last known price',
    reason: `Check price before saving. Entered price is ${Math.abs(delta.percent).toFixed(0)}% ${direction} last known.`,
    latest,
  };
};
