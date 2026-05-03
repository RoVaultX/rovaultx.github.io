import type { TierConfig } from "./types";

export type RewardRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type RewardItem = {
  name: string;
  quantity: number;
  weight: number;
  rarity: RewardRarity;
  chancePercent: number;
};

const rarityRank: Record<RewardRarity, number> = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 4,
  Legendary: 5,
};

const rarityByRank: Record<number, RewardRarity> = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
};

export function getAllRewardTiers(tiers: TierConfig[], customTiers: TierConfig[] = []): TierConfig[] {
  return [...tiers, ...customTiers].sort((a, b) => a.robuxAmount - b.robuxAmount);
}

export function findRewardTierByRobuxAmount(
  robuxAmount: number | null,
  tiers: TierConfig[],
  customTiers: TierConfig[] = [],
): TierConfig | null {
  if (!robuxAmount) {
    return null;
  }
  const allTiers = getAllRewardTiers(tiers, customTiers);
  // First try exact match
  const exactMatch = allTiers.find((tier) => tier.robuxAmount === robuxAmount);
  if (exactMatch) {
    return exactMatch;
  }
  // For custom amounts, find the tier with the highest robuxAmount that doesn't exceed the entered amount
  const eligibleTiers = allTiers.filter((tier) => tier.robuxAmount <= robuxAmount);
  if (eligibleTiers.length === 0) {
    return null;
  }
  return eligibleTiers[eligibleTiers.length - 1];
}

function getRarity(rank: number): RewardRarity {
  return rarityByRank[rank] ?? "Common";
}

export function getRewardItems(tier: TierConfig | null): RewardItem[] {
  if (!tier) {
    return [];
  }
  const entries = Object.entries(tier.rewardPool);
  const totalWeight = entries.length;
  return entries
    .map(([name, rarityRank]) => {
      const weight = 1;
      const chancePercent = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
      return {
        name,
        quantity: rarityRank,
        weight,
        rarity: getRarity(rarityRank),
        chancePercent,
      };
    })
    .sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity] || a.name.localeCompare(b.name));
}

export function rollReward(tier: TierConfig): RewardItem | null {
  const items = getRewardItems(tier).filter((item) => item.weight > 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }
  let target = Math.random() * totalWeight;
  for (const item of items) {
    target -= item.weight;
    if (target <= 0) {
      return item;
    }
  }
  return items.at(-1) ?? null;
}

export function rollRewards(tier: TierConfig): RewardItem[] {
  return Array.from({ length: tier.rewardAmount }, () => rollReward(tier)).filter(
    (item): item is RewardItem => item !== null,
  );
}
