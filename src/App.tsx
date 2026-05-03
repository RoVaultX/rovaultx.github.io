import { useEffect, useMemo, useState } from "react";
import rawConfig from "./config/siteConfig.json";
import { DonationGate } from "./components/DonationGate";
import { RouletteSpinnerGroup } from "./components/RouletteSpinner";
import { SupportPackages } from "./components/SupportPackages";
import { calculateSuggestedDonation } from "./lib/pricing";
import { findRewardTierByRobuxAmount } from "./lib/rewards";
import { getStockStatus } from "./lib/stock";
import type { PromoConfig, SiteConfig } from "./lib/types";
import "./styles.css";

const siteConfig = rawConfig as unknown as SiteConfig;
const STOCK_SOURCE_URL = "/stock.json";
const PROMOS_SOURCE_URL = "/promos.json";
const STOCK_REFRESH_MS = 30_000;

function normalizePromoCode(value: string): string {
  return value.trim().toUpperCase();
}

function parseStockValue(rawValue: unknown): number | null {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return Math.max(0, Math.round(rawValue));
  }
  if (typeof rawValue === "string") {
    const parsed = Number(rawValue.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }
  return null;
}

function parsePromoConfig(rawValue: unknown): PromoConfig[] {
  if (!rawValue || typeof rawValue !== "object") {
    return [];
  }
  const maybePromos = (rawValue as { promos?: unknown }).promos;
  if (!Array.isArray(maybePromos)) {
    return [];
  }
  return maybePromos.flatMap((rawPromo) => {
    if (!rawPromo || typeof rawPromo !== "object") {
      return [];
    }
    const promo = rawPromo as { code?: unknown; discountPercent?: unknown };
    if (typeof promo.code !== "string") {
      return [];
    }
    const discountPercent = Number(promo.discountPercent);
    if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
      return [];
    }
    return [{
      code: normalizePromoCode(promo.code),
      discountPercent: Math.min(100, Math.round(discountPercent * 100) / 100),
    }];
  });
}

export default function App() {
  const defaultTier = siteConfig.tiers[0] ?? null;
  const [selectedTierId, setSelectedTierId] = useState<string | null>(defaultTier?.id ?? null);
  const [selectedRobuxAmount, setSelectedRobuxAmount] = useState<number | null>(
    defaultTier?.robuxAmount ?? null,
  );
  const [customRobuxAmount, setCustomRobuxAmount] = useState(siteConfig.minimumCustomRobux);
  const [stockRobux, setStockRobux] = useState(0);
  const [stockError, setStockError] = useState("");
  const [promos, setPromos] = useState<PromoConfig[]>([]);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    async function loadStock() {
      try {
        const stockUrl = new URL(STOCK_SOURCE_URL, window.location.origin);
        stockUrl.searchParams.set("t", Date.now().toString());
        const response = await fetch(stockUrl.toString(), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load stock configuration.");
        }
        const data = (await response.json()) as { stockRobux?: unknown };
        const parsedStock = parseStockValue(data.stockRobux);
        if (parsedStock === null) {
          throw new Error("Stock file is missing a numeric stockRobux value.");
        }
        setStockRobux(parsedStock);
        setStockError("");
      } catch (error) {
        setStockError(error instanceof Error ? error.message : "Stock unavailable.");
        setStockRobux(0);
      }
    }
    loadStock();
    const intervalId = window.setInterval(loadStock, STOCK_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    async function loadPromos() {
      try {
        const promosUrl = new URL(PROMOS_SOURCE_URL, window.location.origin);
        promosUrl.searchParams.set("t", Date.now().toString());
        const response = await fetch(promosUrl.toString(), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load promotion codes.");
        }
        const data = await response.json();
        setPromos(parsePromoConfig(data));
        setPromoError("");
      } catch (error) {
        setPromos([]);
        setPromoError(error instanceof Error ? error.message : "Promos unavailable.");
      }
    }
    loadPromos();
  }, []);

  const stockStatus = getStockStatus(
    stockRobux,
    siteConfig.lowStockThresholdRobux,
  );

  const suggestedDonation = useMemo(() => {
    if (!selectedRobuxAmount) {
      return null;
    }
    return calculateSuggestedDonation(selectedRobuxAmount, siteConfig.rateUsdPer1000Robux);
  }, [selectedRobuxAmount]);

  const selectedRewardTier = useMemo(
    () => findRewardTierByRobuxAmount(selectedRobuxAmount, siteConfig.tiers, siteConfig.customtiers),
    [selectedRobuxAmount],
  );

  return (
    <main className="container">
      <header className="site-header">
        <div className="site-header-body">
          <div className="site-brand">
            <div>
              <div className="site-title-row">
                <img
                  className="site-logo"
                  src="/RoVaultXLogo.png"
                  alt={`${siteConfig.siteName} logo`}
                  loading="eager"
                  decoding="async"
                />
                <h1>{siteConfig.siteName}</h1>
              </div>
              <p className="subtitle">
                Support the development of Primal Awakening through donation tiers. Contribute to new content, creator funding, and future updates—while receiving Robux at a rate of $
                {siteConfig.rateUsdPer1000Robux.toFixed(2)} per 1,000 Robux and generated rewards based on your selected tier!
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="stock-banner">
        <div className="stock-main">
          <strong>Current Stock:</strong>{" "}
          <span className="stock-amount">R${stockRobux.toLocaleString()}</span>
        </div>
        {stockError && <p className="stock-warning">{stockError}</p>}
        {stockStatus.isOutOfStock && (
          <p className="stock-warning">Out of stock. All support options are disabled.</p>
        )}
        {!stockStatus.isOutOfStock && stockStatus.isLowStock && (
          <p className="stock-warning">
            Low stock. Higher tiers are disabled automatically.
          </p>
        )}
      </section>

      <SupportPackages
        tiers={siteConfig.tiers}
        rateUsdPer1000Robux={siteConfig.rateUsdPer1000Robux}
        stockRobux={stockRobux}
        isOutOfStock={stockStatus.isOutOfStock}
        selectedId={selectedTierId}
        allowCustom={siteConfig.allowCustom}
        minimumCustomRobux={siteConfig.minimumCustomRobux}
        maximumCustomRobux={siteConfig.maximumCustomRobux}
        customValue={customRobuxAmount}
        onCustomChange={setCustomRobuxAmount}
        onSelect={({ id, robuxAmount }) => {
          setSelectedTierId(id);
          setSelectedRobuxAmount(robuxAmount);
        }}
      />

      <RouletteSpinnerGroup tier={selectedRewardTier} />

      <DonationGate
        robuxAmount={selectedRobuxAmount}
        rewardTier={selectedRewardTier}
        suggestedDonation={suggestedDonation}
        promos={promos}
        promoLoadError={promoError}
        disabled={stockStatus.isOutOfStock}
      />
    </main>
  );
}
