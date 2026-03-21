import { create } from 'zustand';

export interface ConfirmOpts {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

interface ConfirmStore {
  open: boolean;
  opts: ConfirmOpts | null;
  confirm: (opts: ConfirmOpts) => void;
  dismiss: () => void;
}

export const useConfirmStore = create<ConfirmStore>((set) => ({
  open: false,
  opts: null,
  confirm: (opts) => set({ open: true, opts }),
  dismiss: () => set({ open: false, opts: null }),
}));

/** Imperative — call outside React components (e.g. keyboard handlers). */
export const showConfirm = (opts: ConfirmOpts) =>
  useConfirmStore.getState().confirm(opts);
