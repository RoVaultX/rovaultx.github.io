export type StockStatus = {
  isOutOfStock: boolean;
  isLowStock: boolean;
};

export function getStockStatus(
  stockRobux: number,
  lowStockThresholdRobux: number,
): StockStatus {
  return {
    isOutOfStock: stockRobux <= 0,
    isLowStock: stockRobux > 0 && stockRobux <= lowStockThresholdRobux,
  };
}

export function canFulfillRequest(
  requestedRobux: number,
  stockRobux: number,
  isOutOfStock: boolean,
): boolean {
  if (isOutOfStock) {
    return false;
  }

  return requestedRobux <= stockRobux;
}
