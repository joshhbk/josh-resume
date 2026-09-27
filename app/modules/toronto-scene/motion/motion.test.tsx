import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { getPortfolio } from "../../portfolio-content/portfolio";
import { PortfolioPage } from "../../portfolio-page/portfolio-page";
import { SceneProvider, useScene, type SceneMode, type WeatherMode } from "../scene-provider";
import { TorontoScene } from "../toronto-scene";
import { backdropPasses, weatherPasses, type PassEntry } from "./motion-registry";
import type { ScenePass } from "./motion-types";
import { SceneMotionProvider, useSceneMotion } from "./scene-motion-provider";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function ApplyPass({
  kind,
  id,
  pass,
  mode,
  weatherMode,
}: {
  kind: "backdrop" | "weather";
  id: string;
  pass: ScenePass;
  mode: SceneMode;
  weatherMode: WeatherMode;
}) {
  const {
    actions: { setBackdrop, setWeather },
  } = useSceneMotion();
  const {
    actions: { setMode, setWeatherMode },
  } = useScene();

  useEffect(() => {
    (kind === "backdrop" ? setBackdrop : setWeather)({ id, pass });
    setMode(mode);
    setWeatherMode(weatherMode);
  }, [kind, id, pass, mode, weatherMode, setBackdrop, setWeather, setMode, setWeatherMode]);

  return null;
}

const skies = [
  ["day", "clear"],
  ["day", "cloudy"],
  ["dusk", "rain"],
  ["night", "rain"],
  ["night", "snow"],
  ["dawn", "snow"],
] as const;

describe.each([
  ...backdropPasses.map((entry) => ["backdrop", entry.id, entry] as const),
  ...weatherPasses.map((entry) => ["weather", entry.id, entry] as const),
])("%s pass %s", (kind, _id, entry: PassEntry) => {
  it.each(skies)("renders over a %s sky with %s", async (mode, weatherMode) => {
    const pass = await entry.load();
    const { container } = render(
      <SceneProvider>
        <SceneMotionProvider>
          <ApplyPass kind={kind} id={entry.id} pass={pass} mode={mode} weatherMode={weatherMode} />
          <TorontoScene />
        </SceneMotionProvider>
      </SceneProvider>,
    );
    const scene = container.querySelector<HTMLElement>("[data-phase][data-weather]");

    await waitFor(() =>
      expect(scene).toHaveAttribute(
        kind === "backdrop" ? "data-backdrop-motion" : "data-weather-fx",
        entry.id,
      ),
    );
    expect(scene).toHaveAttribute("data-phase", mode);
    expect(scene).toHaveAttribute("data-weather", weatherMode);
    expect(container.querySelectorAll("[data-building-cutout]")).toHaveLength(4);
    expect(container.querySelector('[data-scene-layer="tower"]')).not.toBeNull();
  });
});

describe("motion lab", () => {
  it("applies a backdrop and a weather pass and keeps them in the URL", async () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const lab = within(screen.getByRole("complementary", { name: "Motion lab" }));
    const scene = container.querySelector<HTMLElement>("[data-phase][data-weather]");
    const [, backdrop] = backdropPasses;
    const [, weather] = weatherPasses;

    fireEvent.click(lab.getByRole("button", { expanded: false }));
    await act(async () => {
      fireEvent.click(lab.getByRole("button", { name: new RegExp(backdrop.name) }));
    });
    await act(async () => {
      fireEvent.click(lab.getByRole("button", { name: new RegExp(weather.name) }));
    });

    await waitFor(() => expect(scene).toHaveAttribute("data-backdrop-motion", backdrop.id));
    await waitFor(() => expect(scene).toHaveAttribute("data-weather-fx", weather.id));
    const search = new URLSearchParams(window.location.search);
    expect(search.get("backdrop")).toBe(backdrop.id);
    expect(search.get("weather-fx")).toBe(weather.id);

    fireEvent.click(lab.getByRole("button", { name: "Rain" }));
    expect(scene).toHaveAttribute("data-weather", "rain");
  });

  it("restores passes named in the URL", async () => {
    const [, , backdrop] = backdropPasses;
    window.history.replaceState(null, "", `/?backdrop=${backdrop.id}`);
    const { container } = render(<PortfolioPage content={getPortfolio()} />);

    await waitFor(() =>
      expect(container.querySelector("[data-backdrop-motion]")).toHaveAttribute(
        "data-backdrop-motion",
        backdrop.id,
      ),
    );
  });

  it("hides the page layout to show the scene on its own", () => {
    const { container } = render(<PortfolioPage content={getPortfolio()} />);
    const lab = within(screen.getByRole("complementary", { name: "Motion lab" }));

    fireEvent.click(lab.getByRole("button", { expanded: false }));
    fireEvent.click(lab.getByRole("button", { name: "Hide page" }));

    expect(container.querySelector("[data-peek]")).toHaveAttribute("inert");
  });
});
