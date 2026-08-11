import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatImageUrl(url?: string | null, fallback: string = ""): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return fallback;
  }
  const cleanUrl = url.trim();
  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("data:") ||
    cleanUrl.startsWith("blob:")
  ) {
    return cleanUrl;
  }
  if (cleanUrl.startsWith("/api/uploads/")) {
    return cleanUrl;
  }
  if (cleanUrl.startsWith("/uploads/")) {
    return `/api${cleanUrl}`;
  }
  if (cleanUrl.startsWith("uploads/")) {
    return `/api/${cleanUrl}`;
  }
  // bare filename like "1777989826453_1001301432.jpg"
  return `/api/uploads/${cleanUrl.replace(/^\/+/, "")}`;
}

export function buildPlanFeatures(plan: {
  limiteMusicas: string | number;
  personalizacaoPercent: string | number;
  canUploadBanner?: boolean;
  canUploadProfilePhoto?: boolean;
  canCustomizeFont?: boolean;
  canCustomizeBackground?: boolean;
  canCustomizeTextColor?: boolean;
  canCustomizePlayerStyle?: boolean;
  canCustomizePlayerColor?: boolean;
}): string[] {
  const features: string[] = [];
  const songs = parseInt(String(plan.limiteMusicas));
  const pct = parseInt(String(plan.personalizacaoPercent));

  features.push(`${songs} ${songs === 1 ? "música" : "músicas"}`);
  features.push(`${pct}% personalização`);

  if (plan.canUploadProfilePhoto) features.push("Foto de perfil");
  if (plan.canUploadBanner) features.push("Banner");
  if (plan.canCustomizeBackground) features.push("Fundo customizável");
  if (plan.canCustomizeTextColor) features.push("Cor do texto");
  if (plan.canCustomizeFont) features.push("Fonte personalizada");
  if (plan.canCustomizePlayerStyle) features.push("Player customizável");
  if (plan.canCustomizePlayerColor) features.push("Cor do player");

  return features;
}
