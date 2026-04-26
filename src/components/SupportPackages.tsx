import { calculateSuggestedDonation, formatUsd } from "../lib/pricing";
import { canFulfillRequest } from "../lib/stock";
import type { TierConfig } from "../lib/types";

type SupportPackagesProps = {
  tiers: TierConfig[];
  rateUsdPer1000Robux: number;
  stockRobux: number;
  isOutOfStock: boolean;
  selectedId: string | null;
  onSelect: (payload: { id: string; robuxAmount: number }) => void;
};

export function SupportPackages({
  tiers,
  rateUsdPer1000Robux,
  stockRobux,
  isOutOfStock,
  selectedId,
  onSelect,
}: SupportPackagesProps) {
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
      </div>
    </section>
  );
}
