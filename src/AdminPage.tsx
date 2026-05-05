import { useMemo, useState } from "react";
import rawConfig from "./config/siteConfig.json";
import { RouletteSpinner } from "./components/RouletteSpinner";
import { RewardsPanel } from "./components/RewardsPanel";
import { getAllRewardTiers, rollRewards, type RewardItem } from "./lib/rewards";
import type { PromoConfig, SiteConfig } from "./lib/types";
import "./styles.css";

const siteConfig = rawConfig as unknown as SiteConfig;
const workerApiBase = import.meta.env.VITE_WORKER_API_BASE ?? "";
const isLocalAdminBypassEnabled = import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(window.location.hostname);
const LOCAL_PROMOS_STORAGE_KEY = "rovaultx:localPromos";
const LOCAL_STOCK_STORAGE_KEY = "rovaultx:localStock";
const LOCAL_ADMIN_TOKEN = "local-dev-bypass";

type AdminLoginResponse = {
  token?: string;
};

type PromoStore = {
  promos: PromoConfig[];
};

type StockStore = {
  stockRobux: number;
};

type AdminPanel = "promos" | "stock" | "rewards" | null;

export default function AdminPage() {
  const tiers = useMemo(() => getAllRewardTiers(siteConfig.tiers, siteConfig.customtiers), []);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [activePanel, setActivePanel] = useState<AdminPanel>(null);
  const [promos, setPromos] = useState<PromoConfig[]>([]);
  const [promoMessage, setPromoMessage] = useState("");
  const [isSavingPromos, setIsSavingPromos] = useState(false);
  const [stockRobux, setStockRobux] = useState(0);
  const [stockMessage, setStockMessage] = useState("");
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState(tiers[0]?.id ?? "");
  const [spinBatchKey, setSpinBatchKey] = useState(0);
  const [generatedRewards, setGeneratedRewards] = useState<RewardItem[]>([]);
  const [completedRewards, setCompletedRewards] = useState<RewardItem[]>([]);

  const selectedTier = tiers.find((tier) => tier.id === selectedTierId) ?? null;
  const spinnerCount = selectedTier?.rewardAmount ?? 0;

  async function loadPromos(token: string) {
    if (!token) {
      return;
    }
    setPromoMessage("");
    if (token === LOCAL_ADMIN_TOKEN) {
      const storedPromos = window.localStorage.getItem(LOCAL_PROMOS_STORAGE_KEY);
      if (storedPromos) {
        try {
          const payload = JSON.parse(storedPromos) as PromoStore;
          setPromos(Array.isArray(payload.promos) ? payload.promos : []);
        } catch {
          setPromos([]);
        }
      }
      return;
    }
    try {
      const response = await fetch(`${workerApiBase}/api/admin/promos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as PromoStore | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Could not load promos.");
      }
      setPromos("promos" in payload ? payload.promos : []);
    } catch (error) {
      setPromoMessage(error instanceof Error ? error.message : "Could not load promos.");
    }
  }

  async function handleSavePromos() {
    setIsSavingPromos(true);
    setPromoMessage("");
    if (adminToken === LOCAL_ADMIN_TOKEN) {
      window.localStorage.setItem(LOCAL_PROMOS_STORAGE_KEY, JSON.stringify({ promos }));
      setPromoMessage("Promos saved.");
      setIsSavingPromos(false);
      return;
    }
    try {
      const response = await fetch(`${workerApiBase}/api/admin/promos`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ promos }),
      });
      const payload = (await response.json()) as PromoStore | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Could not save promos.");
      }
      setPromos("promos" in payload ? payload.promos : []);
      setPromoMessage("Promos saved.");
    } catch (error) {
      setPromoMessage(error instanceof Error ? error.message : "Could not save promos.");
    } finally {
      setIsSavingPromos(false);
    }
  }

  async function loadStock(token: string) {
    if (!token) {
      return;
    }
    setStockMessage("");
    if (token === LOCAL_ADMIN_TOKEN) {
      const storedStock = window.localStorage.getItem(LOCAL_STOCK_STORAGE_KEY);
      if (storedStock) {
        try {
          const payload = JSON.parse(storedStock) as StockStore;
          setStockRobux(Math.max(0, Math.round(Number(payload.stockRobux) || 0)));
        } catch {
          setStockRobux(0);
        }
      }
      return;
    }
    try {
      const response = await fetch(`${workerApiBase}/api/admin/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as StockStore | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Could not load stock.");
      }
      setStockRobux("stockRobux" in payload ? payload.stockRobux : 0);
    } catch (error) {
      setStockMessage(error instanceof Error ? error.message : "Could not load stock.");
    }
  }

  async function handleSaveStock() {
    setIsSavingStock(true);
    setStockMessage("");
    const stockPayload = { stockRobux: Math.max(0, Math.round(stockRobux)) };
    if (adminToken === LOCAL_ADMIN_TOKEN) {
      window.localStorage.setItem(LOCAL_STOCK_STORAGE_KEY, JSON.stringify(stockPayload));
      setStockRobux(stockPayload.stockRobux);
      setStockMessage("Stock saved.");
      setIsSavingStock(false);
      return;
    }
    try {
      const response = await fetch(`${workerApiBase}/api/admin/stock`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stockPayload),
      });
      const payload = (await response.json()) as StockStore | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Could not save stock.");
      }
      setStockRobux("stockRobux" in payload ? payload.stockRobux : stockPayload.stockRobux);
      setStockMessage("Stock saved.");
    } catch (error) {
      setStockMessage(error instanceof Error ? error.message : "Could not save stock.");
    } finally {
      setIsSavingStock(false);
    }
  }

  function handleAddPromo() {
    setPromos((currentPromos) => [
      ...currentPromos,
      {
        code: "",
        discountPercent: 10,
      },
    ]);
    setPromoMessage("");
  }

  function handleUpdatePromo(index: number, updates: Partial<PromoConfig>) {
    setPromos((currentPromos) => currentPromos.map((promo, promoIndex) => (
      promoIndex === index ? { ...promo, ...updates } : promo
    )));
    setPromoMessage("");
  }

  function handleRemovePromo(index: number) {
    setPromos((currentPromos) => currentPromos.filter((_, promoIndex) => promoIndex !== index));
    setPromoMessage("");
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginMessage("");
    if (isLocalAdminBypassEnabled) {
      setIsAuthenticated(true);
      setAdminToken(LOCAL_ADMIN_TOKEN);
      setPassword("");
      await loadPromos(LOCAL_ADMIN_TOKEN);
      await loadStock(LOCAL_ADMIN_TOKEN);
      return;
    }
    try {
      const response = await fetch(`${workerApiBase}/api/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Invalid admin login.");
      }
      const payload = (await response.json()) as AdminLoginResponse;
      const token = payload.token ?? "";
      if (!token) {
        throw new Error("Admin login did not return a session token.");
      }
      setAdminToken(token);
      setIsAuthenticated(true);
      setPassword("");
      await loadPromos(token);
      await loadStock(token);
    } catch (error) {
      setIsAuthenticated(false);
      const message = error instanceof Error ? error.message : "Unable to login.";
      setLoginMessage(message === "Failed to fetch" ? "Unable to reach admin login service." : message);
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
            <h1>Admin Panel</h1>
          </div>
          <p className="subtitle">Gain access to website administrative actions, promo codes, stock management, reward generation, and more.</p>
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
            <h2>Admin Actions</h2>
            <div className="admin-panel-actions">
              <button className={`promo-apply-button ${activePanel === "promos" ? "admin-panel-button-active" : ""}`} type="button" onClick={() => setActivePanel("promos")}>
                Edit Promos
              </button>
              <button className={`promo-apply-button ${activePanel === "stock" ? "admin-panel-button-active" : ""}`} type="button" onClick={() => setActivePanel("stock")}>
                Edit Stock
              </button>
              <button className={`promo-apply-button ${activePanel === "rewards" ? "admin-panel-button-active" : ""}`} type="button" onClick={() => setActivePanel("rewards")}>
                Get Rewards
              </button>
            </div>
          </section>

          {activePanel === "promos" && (
            <section>
              <div className="admin-section-heading">
                <div>
                  <h2>Private Promos</h2>
                  <p className="helper-text">Edit backend promo storage. This list is only returned after admin login.</p>
                </div>
                <button className="promo-apply-button" type="button" onClick={handleAddPromo}>
                  Add Promo
                </button>
              </div>
              <div className="admin-promo-grid">
                {promos.length === 0 && <p className="helper-text">No promos yet. Add one to get started.</p>}
                {promos.map((promo, index) => (
                  <div className="admin-promo-card" key={index}>
                    <label>
                      <span className="helper-text">Promo Code</span>
                      <input
                        className="promo-input"
                        value={promo.code}
                        onChange={(event) => handleUpdatePromo(index, { code: event.target.value.toUpperCase() })}
                        placeholder="PROMOCODE"
                      />
                    </label>
                    <label>
                      <span className="helper-text">Discount Percent</span>
                      <input
                        className="promo-input promo-discount-input"
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={promo.discountPercent}
                        onChange={(event) => handleUpdatePromo(index, { discountPercent: Number(event.target.value) })}
                      />
                    </label>
                    <button className="admin-remove-button" type="button" onClick={() => handleRemovePromo(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button className="promo-apply-button" type="button" onClick={handleSavePromos} disabled={isSavingPromos || !adminToken}>
                {isSavingPromos ? "Saving..." : "Save Promos"}
              </button>
              {promoMessage && <p className={`promo-message ${promoMessage === "Promos saved." ? "promo-message-success" : "promo-message-error"}`}>{promoMessage}</p>}
            </section>
          )}

          {activePanel === "stock" && (
            <section>
              <div className="admin-section-heading">
                <div>
                  <h2>Private Stock</h2>
                  <p className="helper-text">Edit backend stock storage. This value controls tier availability on the live site.</p>
                </div>
              </div>
              <div className="admin-promo-grid">
                <div className="admin-promo-card">
                  <label>
                    <span className="helper-text">Available Robux Stock</span>
                    <input
                      className="promo-input promo-discount-input"
                      type="number"
                      min="0"
                      step="1"
                      value={stockRobux}
                      onChange={(event) => {
                        setStockRobux(Math.max(0, Math.round(Number(event.target.value) || 0)));
                        setStockMessage("");
                      }}
                    />
                  </label>
                </div>
              </div>
              <button className="promo-apply-button" type="button" onClick={handleSaveStock} disabled={isSavingStock || !adminToken}>
                {isSavingStock ? "Saving..." : "Save Stock"}
              </button>
              {stockMessage && <p className={`promo-message ${stockMessage === "Stock saved." ? "promo-message-success" : "promo-message-error"}`}>{stockMessage}</p>}
            </section>
          )}

          {activePanel === "rewards" && (
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
        </>
      )}
    </main>
  );
}
