import { useMemo, useState } from "react";
import rawConfig from "./config/siteConfig.json";
import { CustomSupportCalculator } from "./components/CustomSupportCalculator";
import { DonationGate } from "./components/DonationGate";
import { SupportPackages } from "./components/SupportPackages";
import { calculateSuggestedDonation } from "./lib/pricing";
import { getStockStatus } from "./lib/stock";
import type { SiteConfig } from "./lib/types";
import "./styles.css";

const siteConfig = rawConfig as SiteConfig;

export default function App() {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedRobuxAmount, setSelectedRobuxAmount] = useState<number | null>(null);

  const stockStatus = getStockStatus(
    siteConfig.stockRobux,
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
        <h1>{siteConfig.siteName}</h1>
        <p className="subtitle">
          Support the project through donation tiers with a reference rate of $
          {siteConfig.rateUsdPer1000Robux.toFixed(2)} per 1,000 Robux.
        </p>
      </header>

      <section className="stock-banner">
        <strong>Current stock:</strong> {siteConfig.stockRobux.toLocaleString()} Robux
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
        stockRobux={siteConfig.stockRobux}
        isOutOfStock={stockStatus.isOutOfStock}
        selectedId={selectedTierId}
        onSelect={({ id, robuxAmount }) => {
          setSelectedTierId(id);
          setSelectedRobuxAmount(robuxAmount);
        }}
      />

      <CustomSupportCalculator
        allowCustom={siteConfig.allowCustom}
        minRobux={siteConfig.minimumCustomRobux}
        maxRobux={siteConfig.maximumCustomRobux}
        stockRobux={siteConfig.stockRobux}
        rateUsdPer1000Robux={siteConfig.rateUsdPer1000Robux}
        isOutOfStock={stockStatus.isOutOfStock}
        selectedValue={selectedTierId === "custom" ? selectedRobuxAmount : null}
        onSelectCustom={(value) => {
          setSelectedTierId("custom");
          setSelectedRobuxAmount(value);
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
