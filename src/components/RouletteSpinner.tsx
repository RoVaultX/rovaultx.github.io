import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TierConfig } from "../lib/types";
import { getRewardItems, rollReward, rollRewards, type RewardItem } from "../lib/rewards";

type RouletteSpinnerProps = {
  tier: TierConfig | null;
  title?: string;
  spinKey?: number;
  hideButton?: boolean;
  forcedReward?: RewardItem;
  onResult?: (reward: RewardItem) => void;
};

type RouletteSpinnerGroupProps = {
  tier: TierConfig | null;
  title?: string;
};

export function RouletteSpinner({ tier, title = "Test Your Luck", spinKey, hideButton = false, forcedReward, onResult }: RouletteSpinnerProps) {
  const rewards = useMemo(() => getRewardItems(tier), [tier]);
  const reelItems = useMemo(() => Array.from({ length: 10 }, () => rewards).flat(), [rewards]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [isReelAnimating, setIsReelAnimating] = useState(false);
  const [result, setResult] = useState<RewardItem | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const lastSpinKeyRef = useRef<number | undefined>(spinKey);

  useEffect(() => {
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    setReelIndex(rewards.length * 3);
    setIsReelAnimating(false);
    setResult(null);
    setIsSpinning(false);
  }, [rewards.length, tier?.id]);

  const spin = useCallback(() => {
    if (!tier || rewards.length === 0 || isSpinning) {
      return;
    }
    setIsSpinning(true);
    setIsReelAnimating(false);
    setResult(null);
    const winner = forcedReward ?? rollReward(tier);
    const winnerIndex = winner ? rewards.findIndex((reward) => reward.name === winner.name) : 0;
    const safeWinnerIndex = Math.max(0, winnerIndex);
    const targetReelIndex = rewards.length * 7 + safeWinnerIndex;
    setReelIndex(rewards.length);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setIsReelAnimating(true);
          setReelIndex(targetReelIndex);
        });
      });
    });
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
    }
    finishTimerRef.current = window.setTimeout(() => {
      setResult(winner);
      setIsSpinning(false);
      setIsReelAnimating(false);
      if (winner) {
        onResult?.(winner);
      }
    }, 2850);
  }, [forcedReward, isSpinning, onResult, rewards, tier]);

  useEffect(() => {
    if (spinKey !== undefined && spinKey !== lastSpinKeyRef.current && tier) {
      lastSpinKeyRef.current = spinKey;
      setResult(null);
      spin();
    }
  }, [spinKey, spin, tier]);

  return (
    <section className="roulette-panel">
      <div className="reward-panel-header">
        <div>
          <h2>{title}</h2>
          <p className="helper-text">Check out the rewards you could receive by donating at your currently selected tier.</p>
        </div>
        {!hideButton && (
          <button className="promo-apply-button" type="button" onClick={spin} disabled={!tier || isSpinning}>
            {isSpinning ? "Testing..." : "Test Rewards"}
          </button>
        )}
      </div>
      <div className="case-window">
        <div className="case-marker" />
        <div
          className={`case-reel ${isReelAnimating ? "spinning" : ""}`}
          style={{ transform: `translateX(calc(50% - ${reelIndex} * 160px - 75px))` }}
        >
          {reelItems.map((reward, index) => (
            <div
              key={`${reward.name}-${index}`}
              className={`case-item rarity-${reward.rarity.toLowerCase().replace(" ", "-")}`}
            >
              <strong>{reward.name}</strong>
              <span>{reward.rarity}</span>
            </div>
          ))}
        </div>
      </div>
      {result && (
        <p className={`roulette-result rarity-${result.rarity.toLowerCase().replace(" ", "-")}`}>
          Reward: <strong>{result.name}</strong> <span>{result.rarity}</span>
        </p>
      )}
    </section>
  );
}

export function RouletteSpinnerGroup({ tier, title = "Test Your Luck" }: RouletteSpinnerGroupProps) {
  const [spinBatchKey, setSpinBatchKey] = useState(0);
  const [generatedRewards, setGeneratedRewards] = useState<RewardItem[]>([]);

  function handleTestRewards() {
    if (!tier) {
      return;
    }
    setGeneratedRewards(rollRewards(tier));
    setSpinBatchKey((value) => value + 1);
  }

  return (
    <section className="roulette-panel">
      <div className="reward-panel-header">
        <div>
          <h2>{title}</h2>
          <p className="helper-text">Check out the rewards you could receive by donating at your currently selected tier.</p>
        </div>
        <button className="promo-apply-button" type="button" onClick={handleTestRewards} disabled={!tier}>
          Test Rewards
        </button>
      </div>
      <div className="admin-spinner-grid">
        {Array.from({ length: tier?.rewardAmount ?? 1 }, (_, index) => (
          <RouletteSpinner
            key={`${tier?.id ?? "none"}-${index}`}
            tier={tier}
            title={`Reward Spinner ${index + 1}`}
            spinKey={spinBatchKey}
            hideButton
            forcedReward={generatedRewards[index]}
          />
        ))}
      </div>
    </section>
  );
}
