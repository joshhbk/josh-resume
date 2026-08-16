export const motionModes = [
  {
    id: "quiet",
    label: "Quiet",
    description: "A restrained fade and gentle section reveals.",
    href: "/",
  },
  {
    id: "stagger",
    label: "Stagger",
    description: "The type, image and supporting details arrive in sequence.",
    href: "/motion/stagger/",
  },
  {
    id: "wipe",
    label: "Wipe",
    description: "Diagonal fields and images reveal with graphic wipes.",
    href: "/motion/wipe/",
  },
  {
    id: "peek",
    label: "Peek",
    description: "The next section peeks into view and moves over the hero.",
    href: "/motion/peek/",
  },
  {
    id: "kinetic",
    label: "Kinetic",
    description: "A more ambitious staged entrance with scroll-driven movement.",
    href: "/motion/kinetic/",
  },
] as const;

export type MotionMode = (typeof motionModes)[number]["id"];

const validMotionModes = new Set<MotionMode>(motionModes.map(({ id }) => id));

export function resolveMotionMode(value: string | undefined): MotionMode {
  return validMotionModes.has(value as MotionMode) ? (value as MotionMode) : "quiet";
}
