import { getPortfolio } from "../modules/portfolio-content/portfolio";
import { resolveMotionMode } from "../modules/portfolio-page/motion";
import { PortfolioPage } from "../modules/portfolio-page/portfolio-page";
import type { Route } from "./+types/motion";

export default function MotionRoute({ params }: Route.ComponentProps) {
  return <PortfolioPage content={getPortfolio()} motion={resolveMotionMode(params.motion)} />;
}
