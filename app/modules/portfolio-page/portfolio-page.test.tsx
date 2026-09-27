import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getPortfolio } from "../portfolio-content/portfolio";
import { PortfolioPage } from "./portfolio-page";

afterEach(cleanup);

describe("portfolio page", () => {
  it("renders the complete professional record", () => {
    const content = getPortfolio();
    const { container } = render(<PortfolioPage content={content} />);
    const text = container.textContent ?? "";

    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(container.querySelector("main#main-content")).not.toBeNull();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(text).toContain(content.person.name);
    expect(text).toContain(content.person.role);
    for (const study of content.caseStudies) {
      expect(text).toContain(study.title);
      expect(text).toContain(study.organization);
    }
    for (const item of content.experience) {
      expect(text).toContain(item.organization);
      expect(text).toContain(item.role);
    }
    for (const profile of content.person.profiles) {
      expect(container.querySelector(`a[href="${profile.url}"]`), profile.label).not.toBeNull();
    }
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector('a[href*="unsplash.com"]')).not.toBeNull();
    expect(container.querySelector('a[href="https://open-meteo.com/"]')).not.toBeNull();
  });

  it("offers every lighting preview and the weather select", () => {
    render(<PortfolioPage content={getPortfolio()} />);
    const lighting = within(screen.getByRole("group", { name: "Skyline lighting" }));

    for (const name of ["Dawn", "Day", "Dusk", "Night", "Live"]) {
      expect(lighting.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("combobox", { name: "Skyline weather" })).toBeInTheDocument();
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

  it("moves the Toronto paper planes by different amounts", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const scene = container.querySelector<HTMLElement>("[data-phase][data-weather]");
    expect(scene).not.toBeNull();
    if (!scene) return;

    fireEvent.pointerMove(window, { clientX: window.innerWidth, clientY: window.innerHeight });

    expect(scene.style.getPropertyValue("--sky-x")).toBe("5px");
    expect(scene.style.getPropertyValue("--land-x")).toBe("24px");
    expect(scene.style.getPropertyValue("--water-x")).toBe("50px");

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

  it("sets the paper sheets' depth at three times the base amounts", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const scene = container.querySelector<HTMLElement>("[data-phase][data-weather]");

    expect(scene?.style.getPropertyValue("--water-lift")).toBe("20px");
    expect(scene?.style.getPropertyValue("--land-lift")).toBe("-6px");
    expect(scene?.style.getPropertyValue("--building-shadow-y")).toBe("39px");
    expect(scene?.style.getPropertyValue("--edge-offset")).toBe("-3px");
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
