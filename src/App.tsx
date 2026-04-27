import { useEffect, useMemo, useState } from "react";
import rawConfig from "./config/siteConfig.json";
import { DonationGate } from "./components/DonationGate";
import { SupportPackages } from "./components/SupportPackages";
import { calculateSuggestedDonation } from "./lib/pricing";
import { getStockStatus } from "./lib/stock";
import type { SiteConfig } from "./lib/types";
import "./styles.css";

const siteConfig = rawConfig as SiteConfig;
const STOCK_SOURCE_URL = "/stock.json";
const STOCK_REFRESH_MS = 30_000;

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

export default function App() {
  const defaultTier = siteConfig.tiers[0] ?? null;
  const [selectedTierId, setSelectedTierId] = useState<string | null>(defaultTier?.id ?? null);
  const [selectedRobuxAmount, setSelectedRobuxAmount] = useState<number | null>(
    defaultTier?.robuxAmount ?? null,
  );
  const [customRobuxAmount, setCustomRobuxAmount] = useState(siteConfig.minimumCustomRobux);
  const [stockRobux, setStockRobux] = useState(0);
  const [stockError, setStockError] = useState("");

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

  return (
    <main className="container">
      <header>
        <div className="logo-mark">R$</div>
        <h1>{siteConfig.siteName}</h1>
        <p className="subtitle">
          Support the project through donation tiers with an exchange rate of $
          {siteConfig.rateUsdPer1000Robux.toFixed(2)} per 1,000 Robux!
        </p>
      </header>

      <section className="stock-banner">
        <strong>Current Stock:</strong>{" "}
        <span className="stock-amount">R${stockRobux.toLocaleString()}</span>
        {stockError && <p className="helper-text warning">{stockError}</p>}
        {stockStatus.isOutOfStock && (
          <p className="helper-text warning">Out of stock. All support options are disabled.</p>
        )}
        {!stockStatus.isOutOfStock && stockStatus.isLowStock && (
          <p className="helper-text warning">
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

      <DonationGate
        robuxAmount={selectedRobuxAmount}
        suggestedDonation={suggestedDonation}
        disabled={stockStatus.isOutOfStock}
      />
    </main>
  );
}
