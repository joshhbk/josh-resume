import { PortfolioPage } from "../modules/portfolio-page/portfolio-page";
import { getPortfolio } from "../modules/portfolio-content/portfolio";

export default function HomeRoute() {
  return <PortfolioPage content={getPortfolio()} motion="quiet" />;
}
