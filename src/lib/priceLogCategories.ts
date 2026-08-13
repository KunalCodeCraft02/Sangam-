export const PRICE_LOG_CATEGORIES = [
  "Sweets",
  "Clothing",
  "Souvenirs",
  "Electronics",
  "Handicrafts",
  "Spices",
  "Other",
] as const;

export type PriceLogCategory = (typeof PRICE_LOG_CATEGORIES)[number];
