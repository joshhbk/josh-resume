import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  prerender: ["/", "/motion/stagger", "/motion/wipe", "/motion/peek", "/motion/kinetic"],
} satisfies Config;
