import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getPortfolio } from "../portfolio-content/portfolio";
import { PortfolioPage } from "./portfolio-page";

afterEach(cleanup);

describe("portfolio page", () => {
  it("renders the complete professional record", () => {
    const content = getPortfolio();

    const { container } = render(<PortfolioPage content={content} />);

    expect(screen.getByRole("heading", { name: content.person.role, level: 1 })).toBeVisible();
    expect(screen.getByRole("link", { name: "Selected work" })).toHaveAttribute("href", "#work");
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("region", { name: "Selected work" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Selected experience" })).toBeVisible();
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Selected work", level: 2 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Selected experience", level: 2 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "GitHub", level: 2 })).toBeVisible();
    expect(screen.getByRole("link", { name: /@joshhbk.*View profile/i })).toHaveAttribute(
      "href",
      "https://github.com/joshhbk",
    );
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    for (const study of content.caseStudies) {
      expect(screen.getByRole("heading", { name: study.title, level: 3 })).toBeVisible();
    }

    for (const item of content.experience) {
      expect(screen.getByRole("heading", { name: item.organization, level: 3 })).toBeVisible();
    }
  });

  it("has no automated accessibility violations", async () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
