export interface WishlistCandidate {
  id: string;
  name: string;
}

const STOPWORD_MIN_LENGTH = 4;

export function findWishlistMatch(
  itemName: string,
  wishlistItems: WishlistCandidate[]
): WishlistCandidate | null {
  const normalizedItem = itemName.trim().toLowerCase();
  if (!normalizedItem) return null;

  const itemWords = new Set(
    normalizedItem.split(/\s+/).filter((w) => w.length >= STOPWORD_MIN_LENGTH)
  );

  for (const wish of wishlistItems) {
    const normalizedWish = wish.name.trim().toLowerCase();
    if (!normalizedWish) continue;

    if (normalizedItem.includes(normalizedWish) || normalizedWish.includes(normalizedItem)) {
      return wish;
    }

    const wishWords = normalizedWish.split(/\s+/).filter((w) => w.length >= STOPWORD_MIN_LENGTH);
    if (wishWords.some((w) => itemWords.has(w))) {
      return wish;
    }
  }

  return null;
}
