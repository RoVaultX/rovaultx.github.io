import { useMemo, useState } from "react";
import rawConfig from "./config/siteConfig.json";
import { RouletteSpinner } from "./components/RouletteSpinner";
import { RewardsPanel } from "./components/RewardsPanel";
import { getAllRewardTiers, rollRewards, type RewardItem } from "./lib/rewards";
import type { SiteConfig } from "./lib/types";
import "./styles.css";

const siteConfig = rawConfig as unknown as SiteConfig;
const workerApiBase = import.meta.env.VITE_WORKER_API_BASE ?? "";
const isLocalAdminBypassEnabled = import.meta.env.DEV && window.location.hostname === "localhost";

export default function AdminPage() {
  const tiers = useMemo(() => getAllRewardTiers(siteConfig.tiers, siteConfig.customtiers), []);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [selectedTierId, setSelectedTierId] = useState(tiers[0]?.id ?? "");
  const [spinBatchKey, setSpinBatchKey] = useState(0);
  const [generatedRewards, setGeneratedRewards] = useState<RewardItem[]>([]);
  const [completedRewards, setCompletedRewards] = useState<RewardItem[]>([]);

  const selectedTier = tiers.find((tier) => tier.id === selectedTierId) ?? null;
  const spinnerCount = selectedTier?.rewardAmount ?? 0;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginMessage("");
    if (isLocalAdminBypassEnabled) {
      setIsAuthenticated(true);
      setPassword("");
      return;
    }
    try {
      const response = await fetch(`${workerApiBase}/api/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        throw new Error("Invalid admin login.");
      }
      setIsAuthenticated(true);
      setPassword("");
    } catch (error) {
      setIsAuthenticated(false);
      setLoginMessage(error instanceof Error ? error.message : "Unable to login.");
    }
  }

  function handleGenerateRewards() {
    if (!selectedTier) {
      return;
    }
    setCompletedRewards([]);
    setGeneratedRewards(rollRewards(selectedTier));
    setSpinBatchKey((value) => value + 1);
  }

  function handleTierChange(tierId: string) {
    setSelectedTierId(tierId);
    setGeneratedRewards([]);
    setCompletedRewards([]);
    setSpinBatchKey(0);
  }

  function handleSpinnerResult(index: number, reward: RewardItem) {
    setCompletedRewards((prev) => {
      const next = [...prev];
      next[index] = reward;
      return next;
    });
  }

  return (
    <main className="container admin-page">
      <header className="site-header">
        <div className="site-header-body">
          <div className="site-title-row">
            <img className="site-logo" src="/RoVaultXLogo.png" alt="RoVaultX logo" />
            <h1>Admin Rewards</h1>
          </div>
          <p className="subtitle">Generate the exact reward rolls to grant after completing Robux delivery.</p>
        </div>
      </header>

      {!isAuthenticated && (
        <section>
          <h2>Admin Login</h2>
          <form className="admin-form" onSubmit={handleLogin}>
            <label>
              <span className="helper-text">Username</span>
              <input className="promo-input" value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label>
              <span className="helper-text">Password</span>
              <input
                className="promo-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="promo-apply-button" type="submit">Login</button>
          </form>
          {loginMessage && <p className="promo-message promo-message-error">{loginMessage}</p>}
        </section>
      )}

      {isAuthenticated && selectedTier && (
        <>
          <section>
            <h2>Select Tier</h2>
            <div className="admin-controls">
              <select className="admin-select" value={selectedTierId} onChange={(event) => handleTierChange(event.target.value)}>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.label} - R${tier.robuxAmount.toLocaleString()} - {tier.rewardAmount} reward{tier.rewardAmount === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <RewardsPanel tier={selectedTier} title="Selected Reward Pool" />

          <div className="admin-spinner-grid">
            {Array.from({ length: spinnerCount }, (_, index) => (
              <RouletteSpinner
                key={`${selectedTier.id}-${index}`}
                tier={selectedTier}
                title={`Reward Spinner ${index + 1}`}
                spinKey={spinBatchKey}
                hideButton
                forcedReward={generatedRewards[index]}
                onResult={(reward) => handleSpinnerResult(index, reward)}
              />
            ))}
          </div>

          {completedRewards.length > 0 && (
            <section>
              <h2>Generated Rewards</h2>
              <div className="generated-reward-grid">
                {completedRewards.map((reward, index) => (
                  <div key={`${reward.name}-${index}`} className={`reward-card rarity-${reward.rarity.toLowerCase().replace(" ", "-")}`}>
                    <div className="reward-card-top">
                      <strong>Reward {index + 1}</strong>
                      <span>{reward.rarity}</span>
                    </div>
                    <div className="reward-card-bottom">
                      <span>{reward.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <button className="promo-apply-button admin-get-rewards-button" type="button" onClick={handleGenerateRewards}>
              Get Rewards
            </button>
          </section>
        </>
      )}
    </main>
  );
}
