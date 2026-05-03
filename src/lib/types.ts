export type TierConfig = {
  id: string;
  label: string;
  robuxAmount: number;
  rewardAmount: number;
  rewardPool: Record<string, number>;
};

export type SiteConfig = {
  siteName: string;
  rateUsdPer1000Robux: number;
  lowStockThresholdRobux: number;
  allowCustom: boolean;
  minimumCustomRobux: number;
  maximumCustomRobux: number;
  tiers: TierConfig[];
  customtiers: TierConfig[];
};

export type PromoConfig = {
  code: string;
  discountPercent: number;
};
