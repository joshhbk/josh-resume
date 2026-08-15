import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getPortfolio } from "../portfolio-content/portfolio";
import { PortfolioPage } from "./portfolio-page";

describe("portfolio page", () => {
  it("renders the complete professional record", () => {
    const content = getPortfolio();

    render(<PortfolioPage content={content} />);

    expect(screen.getByRole("heading", { name: content.person.role, level: 1 })).toBeVisible();
    expect(screen.getByRole("button", { name: "Selected work" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Selected work", level: 2 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Selected experience", level: 2 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Contact", level: 2 })).toBeVisible();

    for (const study of content.caseStudies) {
      expect(screen.getByRole("heading", { name: study.title, level: 3 })).toBeVisible();
    }

    for (const item of content.experience) {
      expect(screen.getByRole("heading", { name: item.organization, level: 3 })).toBeVisible();
    }
  });
});
