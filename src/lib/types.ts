export type TierConfig = {
  id: string;
  label: string;
  robuxAmount: number;
};

export type SiteConfig = {
  siteName: string;
  rateUsdPer1000Robux: number;
  stockRobux: number;
  lowStockThresholdRobux: number;
  allowCustom: boolean;
  minimumCustomRobux: number;
  maximumCustomRobux: number;
  tiers: TierConfig[];
};
