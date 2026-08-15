import { portfolioSchema, type Portfolio } from "./model";
import { rawPortfolio } from "./raw-content";

const portfolio = portfolioSchema.parse(rawPortfolio);

export function getPortfolio(): Portfolio {
  return portfolio;
}

export function getLeadCaseStudy(): Portfolio["caseStudies"][number] {
  const lead = portfolio.caseStudies[0];

  if (!lead) {
    throw new Error("Portfolio content requires at least one case study.");
  }

  return lead;
}
