import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price, pair) {
  if (!price) return "—";
  const decimals = pair?.includes("JPY") ? 3 : 5;
  return Number(price).toFixed(decimals);
}

export function formatConfidence(confidence) {
  return `${Number(confidence).toFixed(1)}%`;
}

export function getConfidenceColor(confidence) {
  if (confidence >= 70) return "confidence-high";
  if (confidence >= 50) return "confidence-medium";
  return "confidence-low";
}

export function getSignalTypeClass(type) {
  switch (type?.toUpperCase()) {
    case "BUY":
      return "signal-buy";
    case "SELL":
      return "signal-sell";
    default:
      return "signal-neutral";
  }
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
