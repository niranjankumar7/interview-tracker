import type { OfferDetails } from "@/types";

export function getOfferCurrency(offer: OfferDetails | undefined): string {
  const currency = offer?.currency?.trim();
  return currency ? currency : "INR";
}

export function computeOfferTotalCTC(offer: OfferDetails | undefined): number | null {
  if (!offer) return null;

  if (typeof offer.totalCTC === "number" && Number.isFinite(offer.totalCTC)) {
    return offer.totalCTC;
  }

  let total = 0;
  let hasAny = false;

  if (typeof offer.baseSalary === "number" && Number.isFinite(offer.baseSalary)) {
    total += offer.baseSalary;
    hasAny = true;
  }

  if (typeof offer.bonus === "number" && Number.isFinite(offer.bonus)) {
    total += offer.bonus;
    hasAny = true;
  }

  if (typeof offer.equity === "number" && Number.isFinite(offer.equity)) {
    total += offer.equity;
    hasAny = true;
  }

  return hasAny ? total : null;
}

export function formatOfferTotalCTC(offer: OfferDetails | undefined): string | null {
  const total = computeOfferTotalCTC(offer);
  if (total === null) return null;
  return `${total.toLocaleString()} ${getOfferCurrency(offer)}`;
}
