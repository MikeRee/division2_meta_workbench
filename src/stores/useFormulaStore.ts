import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Formula } from '../models/Formula';
import { getBasePath } from '../utils/basePath';

interface FormulaStore {
  formulas: Record<string, Formula[]>;
  _hasHydrated: boolean;
  setFormulas: (category: string, formulas: Formula[]) => void;
  setAllFormulas: (formulas: Record<string, Formula[]>) => void;
  addFormula: (category: string, formula: Formula) => void;
  updateFormula: (category: string, index: number, formula: Formula) => void;
  removeFormula: (category: string, index: number) => void;
  reorderFormula: (category: string, fromIndex: number, toIndex: number) => void;
  getFormulasByCategory: (category: string) => Formula[];
  addCategory: (category: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  clearCategory: (category: string) => void;
  clearAll: () => void;
  bootstrapFromFile: () => Promise<void>;
}

export const useFormulaStore = create<FormulaStore>()(
  persist(
    (set, get) => ({
      formulas: {},
      _hasHydrated: false,

      setFormulas: (category: string, formulas: Formula[]) =>
        set((state) => ({
          formulas: { ...state.formulas, [category]: formulas },
        })),

      setAllFormulas: (formulas: Record<string, Formula[]>) => set({ formulas }),

      addFormula: (category: string, formula: Formula) =>
        set((state) => ({
          formulas: {
            ...state.formulas,
            [category]: [...(state.formulas[category] || []), formula],
          },
        })),

      updateFormula: (category: string, index: number, formula: Formula) =>
        set((state) => {
          const list = [...(state.formulas[category] || [])];
          if (index >= 0 && index < list.length) {
            list[index] = formula;
          }
          return { formulas: { ...state.formulas, [category]: list } };
        }),

      removeFormula: (category: string, index: number) =>
        set((state) => {
          const list = [...(state.formulas[category] || [])];
          list.splice(index, 1);
          return { formulas: { ...state.formulas, [category]: list } };
        }),

      reorderFormula: (category: string, fromIndex: number, toIndex: number) =>
        set((state) => {
          const list = [...(state.formulas[category] || [])];
          const [item] = list.splice(fromIndex, 1);
          list.splice(toIndex, 0, item);
          return { formulas: { ...state.formulas, [category]: list } };
        }),

      getFormulasByCategory: (category: string) => {
        return get().formulas[category] || [];
      },

      addCategory: (category: string) =>
        set((state) => {
          if (state.formulas[category]) return state;
          return { formulas: { ...state.formulas, [category]: [] } };
        }),

      renameCategory: (oldName: string, newName: string) =>
        set((state) => {
          if (!state.formulas[oldName] || oldName === newName) return state;
          const { [oldName]: formulas, ...rest } = state.formulas;
          return { formulas: { ...rest, [newName]: formulas } };
        }),

      clearCategory: (category: string) =>
        set((state) => {
          const { [category]: _, ...rest } = state.formulas;
          return { formulas: rest };
        }),

      clearAll: () => set({ formulas: {} }),

      bootstrapFromFile: async () => {
        try {
          const response = await fetch(`${getBasePath()}/clean/formulas.json`);
          if (!response.ok) return;
          const data = await response.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            set({ formulas: data });
            console.log('Bootstrapped formulas from /clean/formulas.json');
          }
        } catch {
          // No bootstrap file available, that's fine
        }
      },
    }),
    {
      name: 'formula-store',
      partialize: (state) => ({ formulas: state.formulas }),
      skipHydration: true,
    },
  ),
);
