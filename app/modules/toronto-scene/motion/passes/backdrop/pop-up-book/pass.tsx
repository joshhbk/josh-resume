import type { ScenePass } from "../../../motion-types";
import { CardShadows, Gutter, PageTurn } from "./book-pages";
import { BookDriver } from "./book-driver";
import styles from "./pop-up-book.module.css";

/**
 * Pop-up book: the diorama opens from flat, its cut-outs hinge up off the page, the whole book
 * tilts in 3D with the cursor, closes a little as you scroll and turns a page when the light changes.
 */
export const pass: ScenePass = {
  className: styles.book ?? "",
  Driver: BookDriver,
  Sky: CardShadows,
  Front: Gutter,
  Screen: PageTurn,
};
