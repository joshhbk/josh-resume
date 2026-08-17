import { describe, expect, it } from "vitest";
import { getLeadCaseStudy, getPortfolio } from "./portfolio";

describe("portfolio content", () => {
  it("exposes the validated professional record", () => {
    const portfolio = getPortfolio();

    expect(portfolio.person.name).toBe("Joshua Hughes");
    expect(portfolio.person.profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: "github",
          url: "https://github.com/joshhbk",
        }),
        expect.objectContaining({
          platform: "linkedin",
          url: "https://www.linkedin.com/in/joshua-hughes-ab189065?trk=contact-info",
        }),
      ]),
    );
    expect(portfolio.person.contactMessage).not.toMatch(/looking for|seeking|available/i);
    expect(portfolio.caseStudies).toHaveLength(3);
    expect(portfolio.experience).toHaveLength(4);
  });

  it("keeps the modernization case study in the lead position", () => {
    expect(getLeadCaseStudy().id).toBe("frontend-modernization");
  });
});
