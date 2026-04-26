import { calculateSuggestedDonation, clampWholeNumber, formatUsd } from "../lib/pricing";
import { canFulfillRequest } from "../lib/stock";

type CustomSupportCalculatorProps = {
  allowCustom: boolean;
  minRobux: number;
  maxRobux: number;
  stockRobux: number;
  rateUsdPer1000Robux: number;
  isOutOfStock: boolean;
  onSelectCustom: (robuxAmount: number) => void;
  selectedValue: number | null;
};

export function CustomSupportCalculator({
  allowCustom,
  minRobux,
  maxRobux,
  stockRobux,
  rateUsdPer1000Robux,
  isOutOfStock,
  onSelectCustom,
  selectedValue,
}: CustomSupportCalculatorProps) {
  if (!allowCustom) {
    return null;
  }

  const defaultValue = selectedValue ?? minRobux;
  const boundedMax = Math.min(maxRobux, Math.max(minRobux, stockRobux));
  const safeValue = clampWholeNumber(defaultValue, minRobux, boundedMax);
  const suggestedDonation = calculateSuggestedDonation(safeValue, rateUsdPer1000Robux);
  const disabled = !canFulfillRequest(safeValue, stockRobux, isOutOfStock);

  return (
    <section>
      <h2>Custom Support Amount</h2>
      <div className="custom-card">
        <label htmlFor="custom-robux-input">Reference amount (Robux)</label>
        <input
          id="custom-robux-input"
          type="number"
          min={minRobux}
          max={boundedMax}
          step={100}
          value={safeValue}
          onChange={(event) =>
            onSelectCustom(
              clampWholeNumber(Number(event.target.value), minRobux, boundedMax),
            )
          }
          disabled={isOutOfStock}
        />
        <p>Suggested donation: {formatUsd(suggestedDonation)}</p>
        <p className="helper-text">
          Allowed range: {minRobux.toLocaleString()} - {boundedMax.toLocaleString()} Robux
        </p>
        {disabled && <p className="helper-text warning">Custom amount exceeds stock.</p>}
      </div>
    </section>
  );
}
