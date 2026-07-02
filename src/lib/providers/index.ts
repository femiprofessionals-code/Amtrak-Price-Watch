import type { Provider } from "@/generated/prisma/enums";
import type { PriceProvider } from "./types";
import { amtrakProvider } from "./amtrak";

const registry: Record<Provider, PriceProvider> = {
  AMTRAK: amtrakProvider,
};

export function getProvider(provider: Provider): PriceProvider {
  const impl = registry[provider];
  if (!impl) throw new Error(`No price provider registered for ${provider}`);
  return impl;
}

export type { PriceProvider, FareQuery, FareQuote } from "./types";
