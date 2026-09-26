export const labelGroups = [
  {
    name: "Paper",
    styles: [
      { id: "handmade", name: "Deckled" },
      { id: "folded", name: "Folded letter" },
      { id: "newsprint", name: "Newsprint" },
    ],
  },
  {
    name: "Tickets",
    styles: [
      { id: "ticket", name: "Classic" },
      { id: "punch", name: "Punch pass" },
      { id: "receipt", name: "Fare receipt" },
    ],
  },
] as const;

export type LabelStyle = (typeof labelGroups)[number]["styles"][number]["id"];
export const defaultLabelStyle: LabelStyle = "handmade";

export function isLabelStyle(value: unknown): value is LabelStyle {
  return labelGroups.some((group) => group.styles.some((style) => style.id === value));
}
