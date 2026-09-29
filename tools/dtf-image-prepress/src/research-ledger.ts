import ledger from "../research/sources.json";

export interface ResearchLedgerStatus {
  schemaVersion: string;
  goal: number;
  verifiedCount: number;
  remaining: number;
  completionPercent: number;
  uniqueUrls: boolean;
  categories: Record<string, number>;
}

export function getResearchLedgerStatus(): ResearchLedgerStatus {
  const urls = ledger.sources.map((source) => source.url);
  const categories: Record<string, number> = {};
  for (const source of ledger.sources) {
    categories[source.category] = (categories[source.category] ?? 0) + 1;
  }
  return {
    schemaVersion: ledger.schemaVersion,
    goal: ledger.goal,
    verifiedCount: ledger.sources.length,
    remaining: Math.max(0, ledger.goal - ledger.sources.length),
    completionPercent: Math.round((ledger.sources.length / ledger.goal) * 10000) / 100,
    uniqueUrls: new Set(urls).size === urls.length,
    categories,
  };
}
