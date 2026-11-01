/** Discover's shelves. The ids match the `portfolios.category` check in the discover migration. */
export const PORTFOLIO_CATEGORIES = [
  { id: "developer", label: "Developer portfolios", blurb: "Websites, products and code." },
  { id: "design", label: "Design portfolios", blurb: "Visuals, branding and creativity." },
  { id: "data", label: "Data and AI", blurb: "Research, models and experiments." },
  { id: "other", label: "Other disciplines", blurb: "Writing, art, engineering and everything else." },
] as const;

export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number]["id"];

export function isPortfolioCategory(value: string): value is PortfolioCategory {
  return PORTFOLIO_CATEGORIES.some((c) => c.id === value);
}

export function categoryInfo(id: string) {
  return PORTFOLIO_CATEGORIES.find((c) => c.id === id) ?? PORTFOLIO_CATEGORIES[3];
}
