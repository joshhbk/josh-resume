import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("motion/:motion", "routes/motion.tsx"),
] satisfies RouteConfig;
