const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function calculateSuggestedDonation(
  robuxAmount: number,
  rateUsdPer1000Robux: number,
): number {
  const rawValue = (robuxAmount / 1000) * rateUsdPer1000Robux;
  return Math.round(rawValue * 100) / 100;
}

export function formatUsd(value: number): string {
  return CURRENCY.format(value);
}

export function clampWholeNumber(
  value: number,
  minValue: number,
  maxValue: number,
): number {
  if (Number.isNaN(value)) {
    return minValue;
  }

  return Math.min(maxValue, Math.max(minValue, Math.round(value)));
}
