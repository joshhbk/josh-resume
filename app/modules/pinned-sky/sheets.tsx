import { createContext, use, useEffect, useState, type ReactNode } from "react";

type Sheets = {
  /** Attach a project's dialog under its id; returns the matching cleanup for a ref callback. */
  register: (id: string, dialog: HTMLDialogElement) => () => void;
  /** Lift a project's sheet out of the sky and move focus to its heading. */
  open: (id: string) => void;
  /** Forget the deep link once a sheet has been folded away. */
  closed: () => void;
};

const SheetsContext = createContext<Sheets | null>(null);

const urlWithoutHash = () => `${window.location.pathname}${window.location.search}`;

function createSheets(): Sheets {
  const dialogs = new Map<string, HTMLDialogElement>();

  return {
    register(id, dialog) {
      dialogs.set(id, dialog);
      return () => {
        if (dialogs.get(id) === dialog) dialogs.delete(id);
      };
    },
    open(id) {
      const dialog = dialogs.get(id);
      if (!dialog || dialog.open) return;
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-sheet-heading]")?.focus();
      window.history.replaceState(window.history.state, "", `${urlWithoutHash()}#${id}`);
    },
    closed() {
      if (window.location.hash) {
        window.history.replaceState(window.history.state, "", urlWithoutHash());
      }
    },
  };
}

/**
 * Lets any card (a project, or a row in the roles list) unfold a project's sheet by id, and
 * opens the sheet named in the URL hash so a single project can be linked to.
 */
export function SheetsProvider({ children }: { children: ReactNode }) {
  const [sheets] = useState(createSheets);

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) sheets.open(id);
  }, [sheets]);

  return <SheetsContext value={sheets}>{children}</SheetsContext>;
}

export function useSheets(): Sheets {
  const sheets = use(SheetsContext);
  if (!sheets) throw new Error("useSheets must be used inside a SheetsProvider.");
  return sheets;
}
