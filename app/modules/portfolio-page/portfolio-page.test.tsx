import axe from "axe-core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByRole("heading", { name: "Profiles", level: 2 })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Professional profiles" })).toBeVisible();
    expect(screen.getByRole("link", { name: /@joshhbk.*GitHub/i })).toHaveAttribute(
      "href",
      "https://github.com/joshhbk",
    );
    expect(screen.getByRole("link", { name: /Joshua Hughes.*LinkedIn/i })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/joshua-hughes-ab189065?trk=contact-info",
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
    fireEvent.click(screen.getByRole("button", { name: /Depth lab/ }));
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it("moves the Toronto paper planes by different amounts", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const scene = container.querySelector<HTMLElement>("[data-phase][data-weather]");
    expect(scene).not.toBeNull();
    if (!scene) return;

    fireEvent.pointerMove(window, { clientX: window.innerWidth, clientY: window.innerHeight });

    expect(scene.style.getPropertyValue("--sky-x")).toBe("2px");
    expect(scene.style.getPropertyValue("--land-x")).toBe("8px");
    expect(scene.style.getPropertyValue("--water-x")).toBe("17px");

    fireEvent.blur(window);
    expect(scene.style.getPropertyValue("--sky-x")).toBe("");
    expect(scene.style.getPropertyValue("--land-x")).toBe("");
    expect(scene.style.getPropertyValue("--water-x")).toBe("");
  });

  it("moves buildings, trees, and shore under one land transform", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const land = container.querySelector('[data-scene-layer="land"]');
    const city = container.querySelector('[data-scene-layer="city"]');
    const cutouts = city?.querySelectorAll("[data-building-cutout]");

    expect(land?.querySelector('[data-scene-layer="city"]')).toBe(city);
    expect(land?.querySelector('[data-scene-layer="trees"]')).not.toBeNull();
    expect(land?.querySelector('[data-scene-layer="shore"]')).not.toBeNull();
    expect(cutouts).toHaveLength(4);
    for (const cutout of cutouts ?? []) {
      expect(cutout.parentElement).toBe(city);
    }
  });

  it("lets visitors preview day and night, then return to live time", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const scene = container.querySelector<HTMLElement>("[data-phase][data-weather]");
    expect(scene).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Night" }));
    expect(scene).toHaveAttribute("data-phase", "night");
    expect(screen.getByRole("button", { name: "Night" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Day" }));
    expect(scene).toHaveAttribute("data-phase", "day");

    fireEvent.click(screen.getByRole("button", { name: "Live" }));
    expect(screen.getByRole("button", { name: "Live" })).toHaveAttribute("aria-pressed", "true");
  });

  it("previews three paper and three ticket labels", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const label = container.querySelector("[data-label-style]");
    const names = [
      ["Paper: Deckled", "handmade"],
      ["Paper: Folded letter", "folded"],
      ["Paper: Newsprint", "newsprint"],
      ["Tickets: Classic", "ticket"],
      ["Tickets: Punch pass", "punch"],
      ["Tickets: Fare receipt", "receipt"],
    ] as const;

    for (const [name, style] of names) {
      const button = screen.getByRole("button", { name });
      fireEvent.click(button);
      expect(label).toHaveAttribute("data-label-style", style);
      expect(button).toHaveAttribute("aria-pressed", "true");
    }

    expect(
      screen.getByRole("heading", { name: getPortfolio().person.role, level: 1 }),
    ).toBeVisible();
  });

  it("tunes and resets the skyline depth controls", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const scene = container.querySelector<HTMLElement>("[data-phase][data-weather]");
    expect(scene).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Depth lab/ }));
    fireEvent.change(screen.getByRole("slider", { name: "Layer spacing" }), {
      target: { value: "2" },
    });
    expect(scene?.style.getPropertyValue("--water-lift")).toBe("10px");

    fireEvent.change(screen.getByRole("slider", { name: "Shadow reach" }), {
      target: { value: "2" },
    });
    expect(scene?.style.getPropertyValue("--building-shadow-y")).toBe("26px");

    fireEvent.change(screen.getByRole("slider", { name: "Cursor parallax" }), {
      target: { value: "2" },
    });
    fireEvent.pointerMove(window, { clientX: window.innerWidth, clientY: window.innerHeight });
    expect(scene?.style.getPropertyValue("--water-x")).toBe("33px");

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(screen.getByRole("button", { name: "Saved" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(scene?.style.getPropertyValue("--water-lift")).toBe("0px");
    expect(scene?.style.getPropertyValue("--building-shadow-y")).toBe("13px");
    expect(screen.getByRole("slider", { name: "Cursor parallax" })).toHaveValue("1");
  });

  it("previews clouds and rain independently of the lighting", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const scene = container.querySelector<HTMLElement>("[data-phase][data-weather]");
    const weather = screen.getByRole("combobox", { name: "Skyline weather" });

    fireEvent.change(weather, { target: { value: "cloudy" } });
    expect(scene).toHaveAttribute("data-weather", "cloudy");
    expect(scene?.style.getPropertyValue("--cloud-opacity")).not.toBe("0.00");

    fireEvent.click(screen.getByRole("button", { name: "Night" }));
    fireEvent.change(weather, { target: { value: "rain" } });
    expect(scene).toHaveAttribute("data-phase", "night");
    expect(scene).toHaveAttribute("data-weather", "rain");
    expect(scene?.style.getPropertyValue("--rain-opacity")).not.toBe("0.00");

    fireEvent.change(weather, { target: { value: "clear" } });
    expect(scene).toHaveAttribute("data-weather", "clear");
    expect(scene?.style.getPropertyValue("--rain-opacity")).toBe("0.00");
  });
});
