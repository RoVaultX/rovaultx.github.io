import { useMemo } from "react";
import type { TierConfig } from "../lib/types";
import { getRewardItems } from "../lib/rewards";

type RewardsPanelProps = {
  tier: TierConfig | null;
  title?: string;
};

export function RewardsPanel({ tier, title = "Possible Rewards" }: RewardsPanelProps) {
  const rewards = useMemo(() => getRewardItems(tier), [tier]);

  if (!tier) {
    return (
      <section className="reward-panel">
        <h2>{title}</h2>
        <p className="helper-text">Select a matching tier to view reward pool details.</p>
      </section>
    );
  }

  return (
    <section className="reward-panel">
      <div className="reward-panel-header">
        <div>
          <h2>{title}</h2>
          <p className="helper-text">
            {tier.label} includes {tier.rewardAmount} reward{tier.rewardAmount === 1 ? "" : "s"} from this pool.
          </p>
        </div>
        <div className="reward-count-pill">R${tier.robuxAmount.toLocaleString()}</div>
      </div>
      <div className="reward-pool-list">
        {rewards.map((reward) => (
          <div key={reward.name} className={`reward-pool-row rarity-${reward.rarity.toLowerCase().replace(" ", "-")}`}>
            <span className="reward-pool-name">{reward.name}</span>
            <span className="reward-pool-rarity">{reward.rarity}</span>
            <span className="reward-pool-chance">{reward.chancePercent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
