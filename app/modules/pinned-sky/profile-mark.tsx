import type { Portfolio } from "../portfolio-content/model";

type Platform = Portfolio["person"]["profiles"][number]["platform"];

const marks: Record<Platform, string> = {
  linkedin:
    "M5.32 7.41a2.06 2.06 0 1 0 0-4.12 2.06 2.06 0 0 0 0 4.12ZM3.54 20.45H7.1V8.98H3.54v11.47Zm5.8 0h3.56v-5.67c0-1.49.29-2.94 2.14-2.94 1.82 0 1.85 1.71 1.85 3.04v5.57h3.56v-6.29c0-3.09-.67-5.46-4.27-5.46-1.73 0-2.89.95-3.37 1.85h-.05V8.98H9.34v11.47Z",
  github:
    "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.82a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z",
};

/** The GitHub or LinkedIn logomark, drawn in the current text colour. */
export function ProfileMark({
  platform,
  className,
}: {
  platform: Platform;
  className?: string | undefined;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={marks[platform]} />
    </svg>
  );
}
