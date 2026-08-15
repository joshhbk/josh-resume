import { AjpwPortfolio } from "../modules/designs/ajpw/ajpw-portfolio";
import { getPortfolio } from "../modules/portfolio-content/portfolio";

export default function HomeRoute() {
  return <AjpwPortfolio content={getPortfolio()} />;
}
