export const COMPLETE_PLAN_PRICE_FLOOR = 10;

export function isCompleteOrPremiumPlan(
  plan: { nome?: string | null; label?: string | null },
  planId?: string | null
): boolean {
  const nome = (plan.nome || "").toLowerCase();
  const label = (plan.label || "").toLowerCase();
  const id = (planId || "").toLowerCase();
  return (
    nome === "premium" ||
    nome === "completo" ||
    label.includes("completo") ||
    label.includes("premium") ||
    id === "premium" ||
    id === "completo"
  );
}

export function applyCompletePlanPriceFloor(
  plan: { nome?: string | null; label?: string | null },
  planId: string | null | undefined,
  planPrice: number,
  finalPrice: number
): { finalPrice: number; discountAmount: number; priceFloorApplied: boolean } {
  const discountAmount = Math.max(0, planPrice - finalPrice);
  if (!isCompleteOrPremiumPlan(plan, planId) || !Number.isFinite(planPrice) || planPrice <= 0) {
    return { finalPrice, discountAmount, priceFloorApplied: false };
  }
  if (finalPrice >= COMPLETE_PLAN_PRICE_FLOOR) {
    return { finalPrice, discountAmount, priceFloorApplied: false };
  }
  const floored = Math.min(planPrice, COMPLETE_PLAN_PRICE_FLOOR);
  return {
    finalPrice: floored,
    discountAmount: Math.max(0, planPrice - floored),
    priceFloorApplied: true,
  };
}
