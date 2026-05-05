import { useState } from "react";
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
  const stackWords = (value: string) => value;
  const boundedMax = Math.min(maximumCustomRobux, Math.max(minimumCustomRobux, stockRobux));
  const safeCustomValue = clampWholeNumber(customValue, minimumCustomRobux, boundedMax);
  const customDisabled = !canFulfillRequest(safeCustomValue, stockRobux, isOutOfStock);
  const customDonation = calculateSuggestedDonation(safeCustomValue, rateUsdPer1000Robux);
  const [customInputValue, setCustomInputValue] = useState(String(safeCustomValue));

  const parsedDraftValue = Number(customInputValue);
  const hasDraftValue = customInputValue.trim().length > 0 && Number.isFinite(parsedDraftValue);
  const isBelowMinimum = hasDraftValue && parsedDraftValue < minimumCustomRobux;

  const commitCustomValue = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setCustomInputValue(String(minimumCustomRobux));
      onCustomChange(minimumCustomRobux);
      onSelect({ id: "custom", robuxAmount: minimumCustomRobux });
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setCustomInputValue(String(safeCustomValue));
      return;
    }
    const clamped = clampWholeNumber(parsed, minimumCustomRobux, boundedMax);
    setCustomInputValue(String(clamped));
    onCustomChange(clamped);
    onSelect({ id: "custom", robuxAmount: clamped });
  };

  return (
    <section>
      <h2>Tiers</h2>
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
              <div className="tier-header">
                <div className="tier-title">{stackWords(tier.label)}</div>
              </div>
              <div className="tier-footer">
                <div className="tier-price">{formatUsd(suggestedDonation)}</div>
                <div className="tier-amount">R${tier.robuxAmount.toLocaleString()}</div>
                {isDisabled ? (
                  <div className="tier-note">Unavailable at current stock!</div>
                ) : (
                  <div className="tier-note tier-note-available">Available</div>
                )}
              </div>
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
            <div className="tier-header">
               <div className="tier-title">{stackWords("Custom")}</div>
            </div>
            <div className="custom-middle">
              <input
                id="custom-tier-input"
                className="custom-input"
                type="number"
                min={0}
                max={boundedMax}
                step={100}
                value={customInputValue}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const nextRawValue = event.target.value;
                  setCustomInputValue(nextRawValue);
                  if (nextRawValue.trim() === "") {
                    onCustomChange(minimumCustomRobux);
                    onSelect({ id: "custom", robuxAmount: minimumCustomRobux });
                    return;
                  }
                  const parsed = Number(nextRawValue);
                  if (!Number.isFinite(parsed)) {
                    return;
                  }
                  if (parsed > boundedMax) {
                    const capped = boundedMax;
                    setCustomInputValue(String(capped));
                    onCustomChange(capped);
                    onSelect({ id: "custom", robuxAmount: capped });
                    return;
                  }
                  if (parsed < minimumCustomRobux) {
                    onCustomChange(minimumCustomRobux);
                    onSelect({ id: "custom", robuxAmount: minimumCustomRobux });
                    return;
                  }
                  if (parsed >= minimumCustomRobux) {
                    const rounded = Math.round(parsed);
                    onCustomChange(rounded);
                    onSelect({ id: "custom", robuxAmount: rounded });
                  }
                }}
                onBlur={(event) => commitCustomValue(event.target.value)}
                disabled={isOutOfStock}
              />
              {isBelowMinimum && (
                <div className="helper-text warning">
                  Minimum allowed is R${minimumCustomRobux.toLocaleString()}.
                </div>
              )}
            </div>
            <div className="custom-footer">
              <div className="tier-price">{formatUsd(customDonation)}</div>
              <div className="tier-amount">R${safeCustomValue.toLocaleString()}</div>
              {customDisabled && (
                <div className="tier-note">Unavailable at current stock!</div>
              )}
              {!customDisabled && (
                <div className="tier-note tier-note-available">Available</div>
              )}
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
