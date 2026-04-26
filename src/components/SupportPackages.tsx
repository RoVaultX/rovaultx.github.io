import { calculateSuggestedDonation, formatUsd } from "../lib/pricing";
import { canFulfillRequest } from "../lib/stock";
import { clampWholeNumber } from "../lib/pricing";
import type { TierConfig } from "../lib/types";

type SupportPackagesProps = {
  tiers: TierConfig[];
  rateUsdPer1000Robux: number;
  stockRobux: number;
  isOutOfStock: boolean;
  selectedId: string | null;
  allowCustom: boolean;
  minimumCustomRobux: number;
  maximumCustomRobux: number;
  customValue: number;
  onCustomChange: (robuxAmount: number) => void;
  onSelect: (payload: { id: string; robuxAmount: number }) => void;
};

export function SupportPackages({
  tiers,
  rateUsdPer1000Robux,
  stockRobux,
  isOutOfStock,
  selectedId,
  allowCustom,
  minimumCustomRobux,
  maximumCustomRobux,
  customValue,
  onCustomChange,
  onSelect,
}: SupportPackagesProps) {
  const boundedMax = Math.min(maximumCustomRobux, Math.max(minimumCustomRobux, stockRobux));
  const safeCustomValue = clampWholeNumber(customValue, minimumCustomRobux, boundedMax);
  const customDisabled = !canFulfillRequest(safeCustomValue, stockRobux, isOutOfStock);
  const customDonation = calculateSuggestedDonation(safeCustomValue, rateUsdPer1000Robux);

  return (
    <section>
      <h2>Suggested Support Tiers</h2>
      <div className="grid">
        {tiers.map((tier) => {
          const isDisabled = !canFulfillRequest(
            tier.robuxAmount,
            stockRobux,
            isOutOfStock,
          );
          const suggestedDonation = calculateSuggestedDonation(
            tier.robuxAmount,
            rateUsdPer1000Robux,
          );
          const isSelected = selectedId === tier.id;

          return (
            <button
              key={tier.id}
              type="button"
              className={`tier-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect({ id: tier.id, robuxAmount: tier.robuxAmount })}
              disabled={isDisabled}
            >
              <div className="tier-title">{tier.label}</div>
              <div className="tier-amount">{tier.robuxAmount.toLocaleString()} Robux</div>
              <div className="tier-price">
                Suggested donation: {formatUsd(suggestedDonation)}
              </div>
              {isDisabled ? (
                <div className="tier-note">Unavailable at current stock</div>
              ) : (
                <div className="tier-note">Available now</div>
              )}
            </button>
          );
        })}

        {allowCustom && (
          <button
            type="button"
            className={`tier-card custom-tier ${selectedId === "custom" ? "selected" : ""}`}
            onClick={() => onSelect({ id: "custom", robuxAmount: safeCustomValue })}
            disabled={isOutOfStock}
          >
            <div className="tier-title">Custom Support</div>
            <div className="tier-amount">R$ {safeCustomValue.toLocaleString()}</div>
            <div className="tier-price">Suggested donation: {formatUsd(customDonation)}</div>
            <label htmlFor="custom-tier-input" className="custom-label">
              Enter custom Robux amount
            </label>
            <input
              id="custom-tier-input"
              className="custom-input"
              type="number"
              min={minimumCustomRobux}
              max={boundedMax}
              step={100}
              value={safeCustomValue}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const nextValue = clampWholeNumber(
                  Number(event.target.value),
                  minimumCustomRobux,
                  boundedMax,
                );
                onCustomChange(nextValue);
                onSelect({ id: "custom", robuxAmount: nextValue });
              }}
              disabled={isOutOfStock}
            />
            <div className="tier-note">
              Range: {minimumCustomRobux.toLocaleString()} - {boundedMax.toLocaleString()} Robux
            </div>
            {customDisabled && (
              <div className="tier-note">Unavailable at current stock</div>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
