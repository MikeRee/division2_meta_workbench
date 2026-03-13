import { create } from 'zustand';
import { Formula } from '../models/Formula';

interface FormulaStore {
  formulas: Record<string, Formula[]>;
  setFormulas: (category: string, formulas: Formula[]) => void;
  addFormula: (category: string, formula: Formula) => void;
  getFormulasByCategory: (category: string) => Formula[];
  clearCategory: (category: string) => void;
  clearAll: () => void;
}

export const useFormulaStore = create<FormulaStore>((set, get) => ({
  formulas: {},

  setFormulas: (category: string, formulas: Formula[]) =>
    set((state) => ({
      formulas: {
        ...state.formulas,
        [category]: formulas
      }
    })),

  addFormula: (category: string, formula: Formula) =>
    set((state) => ({
      formulas: {
        ...state.formulas,
        [category]: [...(state.formulas[category] || []), formula]
      }
    })),

  getFormulasByCategory: (category: string) => {
    return get().formulas[category] || [];
  },

  clearCategory: (category: string) =>
    set((state) => {
      const { [category]: _, ...rest } = state.formulas;
      return { formulas: rest };
    }),

  clearAll: () => set({ formulas: {} })
}));
