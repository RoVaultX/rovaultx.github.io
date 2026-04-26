import { useEffect, useMemo, useState } from "react";
import rawConfig from "./config/siteConfig.json";
import { DonationGate } from "./components/DonationGate";
import { SupportPackages } from "./components/SupportPackages";
import { calculateSuggestedDonation } from "./lib/pricing";
import { getStockStatus } from "./lib/stock";
import type { SiteConfig } from "./lib/types";
import "./styles.css";

const siteConfig = rawConfig as SiteConfig;
const STOCK_SOURCE_URL =
  "https://raw.githubusercontent.com/primalawakeningfunds/Stock/main/stock.json";

export default function App() {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedRobuxAmount, setSelectedRobuxAmount] = useState<number | null>(null);
  const [customRobuxAmount, setCustomRobuxAmount] = useState(siteConfig.minimumCustomRobux);
  const [stockRobux, setStockRobux] = useState(0);
  const [stockError, setStockError] = useState("");

  useEffect(() => {
    async function loadStock() {
      try {
        const response = await fetch(STOCK_SOURCE_URL, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load remote stock configuration.");
        }
        const data = (await response.json()) as { stockRobux?: number };
        if (typeof data.stockRobux !== "number") {
          throw new Error("Remote stock.json is missing a numeric stockRobux value.");
        }
        setStockRobux(Math.max(0, Math.round(data.stockRobux)));
      } catch (error) {
        try {
          const fallback = await fetch("/stock.json", { cache: "no-store" });
          if (!fallback.ok) {
            throw new Error("Fallback stock file unavailable.");
          }
          const fallbackData = (await fallback.json()) as { stockRobux?: number };
          if (typeof fallbackData.stockRobux !== "number") {
            throw new Error("Fallback stock.json is invalid.");
          }
          setStockRobux(Math.max(0, Math.round(fallbackData.stockRobux)));
          setStockError(
            "Using fallback stock. Remote stock source could not be loaded.",
          );
        } catch {
          setStockError(error instanceof Error ? error.message : "Stock unavailable.");
          setStockRobux(0);
        }
      }
    }
    loadStock();
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
          Support the project through donation tiers with a reference rate of $
          {siteConfig.rateUsdPer1000Robux.toFixed(2)} per 1,000 Robux.
        </p>
      </header>

      <section className="stock-banner">
        <strong>Current stock:</strong> {stockRobux.toLocaleString()} Robux
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
