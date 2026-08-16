import { motionModes, type MotionMode } from "./motion";
import styles from "./portfolio-page.module.css";

export function MotionPreview({ activeMode }: { activeMode: MotionMode }) {
  return (
    <nav className={styles.motionPreview} aria-label="Animation versions">
      <ol>
        {motionModes.map((mode, index) => (
          <li key={mode.id}>
            <a
              href={mode.href}
              aria-current={activeMode === mode.id ? "page" : undefined}
              aria-label={`${index + 1}. ${mode.label}: ${mode.description}`}
              title={mode.description}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span>{mode.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
