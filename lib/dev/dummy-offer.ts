import { pickRandom, randomInt } from "@/lib/dev/random";
import type { OfferHeaderInput } from "@/validation/offer/offer-schema";

const COMPANIES = [
  "Autotrasporti Rossi",
  "Bianchi Logistica",
  "Trasporti Verdi",
  "Autolinee Colombo",
  "Ferrari Bus",
  "Esposito Trasporti",
  "Romano Cargo",
  "Gallo Autoservizi",
];

const ADDRESSES = [
  "Via Roma 12, Milano",
  "Via Garibaldi 5, Torino",
  "Corso Italia 88, Bologna",
  "Via Dante 3, Verona",
  "Viale Europa 41, Brescia",
];

/** Builds a randomized, schema-valid offer header for the dev fill button. */
export function makeDummyOffer(): OfferHeaderInput {
  const company = pickRandom(COMPANIES);
  const suffix = randomInt(100, 999);
  const slug = company.toLowerCase().split(" ")[0];
  return {
    customer_name: `${company} ${suffix}`,
    // Leave the optional fields empty sometimes to vary coverage.
    customer_address: Math.random() < 0.7 ? pickRandom(ADDRESSES) : "",
    customer_email: Math.random() < 0.7 ? `info${suffix}@${slug}.example` : "",
  };
}
