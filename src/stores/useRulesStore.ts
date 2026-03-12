import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DataKey } from '../constants/dataKeys';

// Define the RuleBinding type
export interface RuleBinding {
  destination: string; // The target field in the model (e.g., "type", "name", "rpm")
  source: string; // The source field from raw data (e.g., "weaponType", "weaponName")
  rules: string[]; // Array of rule labels to apply in order (e.g., ["lowercase", "trim", "removeSpaces"])
}

// Helper type for rule operations
export type RuleOperation = 'replace' | 'match' | 'mapping' | 'transform' | 'system';

/**
 * System rules are built-in transformation functions that cannot be edited or deleted.
 * They can be added to any RuleBinding.rules array by their name.
 * 
 * Available system rules:
 * - "lowercase": Converts the value to lowercase. If value is an object, converts to JSON string, lowercases, then parses back to object.
 * - "trim whitespace": Trims leading and trailing whitespace from the value. If value is an object, converts to JSON string, trims, then parses back to object.
 */
export type SystemRuleType = 'lowercase' | 'trim whitespace';

export const SYSTEM_RULES: Record<SystemRuleType, (value: any) => any> = {
  lowercase: (value: any) => {
    // Handle objects by converting to JSON, lowercasing, then parsing back
    if (typeof value === 'object' && value !== null) {
      try {
        const jsonString = JSON.stringify(value);
        const lowercased = jsonString.toLowerCase();
        return JSON.parse(lowercased);
      } catch (error) {
        // If parsing fails, return the original value
        console.warn('Failed to lowercase object:', error);
        return value;
      }
    }
    // Handle primitives
    return String(value).toLowerCase();
  },
  'trim whitespace': (value: any) => {
    // Handle objects by converting to JSON, trimming, then parsing back
    if (typeof value === 'object' && value !== null) {
      try {
        const jsonString = JSON.stringify(value);
        const trimmed = jsonString.trim();
        return JSON.parse(trimmed);
      } catch (error) {
        // If parsing fails, return the original value
        console.warn('Failed to trim whitespace from object:', error);
        return value;
      }
    }
    // Handle primitives
    return String(value).trim();
  },
};

interface RulesState {
  // Store rules by label
  replaceRules: Record<string, string[]>; // key is label, value is [match, replace]
  matchRules: Record<string, string>; // key is label, value is regex match
  mappings: Record<string, Record<string, string>>; // outer key is label, inner is key=>value map
  bindings: Record<DataKey, RuleBinding[]>; // bindings per data key
  lastUpdated: number | null;
  isLoading: boolean;

  // Actions
  setReplaceRule: (label: string, match: string, replace: string) => void;
  setMatchRule: (label: string, regex: string) => void;
  setMapping: (label: string, mapping: Record<string, string>) => void;
  addBinding: (dataKey: DataKey, binding: RuleBinding) => void;
  updateBinding: (dataKey: DataKey, index: number, binding: RuleBinding) => void;
  removeBinding: (dataKey: DataKey, index: number) => void;
  reorderBindingRules: (dataKey: DataKey, bindingIndex: number, fromRuleIndex: number, toRuleIndex: number) => void;
  getBindings: (dataKey: DataKey) => RuleBinding[];
  deleteRule: (label: string) => void;
  setLoading: (loading: boolean) => void;
  clearAll: () => void;
  loadRulesFromFile: () => Promise<void>;
  saveToFile: () => void;
}

interface RulesData {
  replaceRules: Record<string, string[]>;
  matchRules: Record<string, string>;
  mappings: Record<string, Record<string, string>>;
  bindings: Record<DataKey, RuleBinding[]>;
}

/**
 * Helper function to save rules to file
 * Triggers a download in the browser
 */
const downloadRulesFile = (data: RulesData) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Saved rules.json');
  } catch (error) {
    console.error('Failed to save rules:', error);
    throw error;
  }
};

/**
 * Load rules from /clean directory
 */
const loadRulesFile = async (): Promise<RulesData | null> => {
  try {
    const response = await fetch('/clean/rules.json');
    if (!response.ok) {
      console.warn(`Failed to load /clean/rules.json: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch (error) {
    console.error('Error loading /clean/rules.json:', error);
    return null;
  }
};

/**
 * RulesStore - Stores labeled rules and bindings for data cleaning
 * Rules are applied in the order of bindings
 */
export const useRulesStore = create<RulesState>()(
  persist(
    (set, get) => ({
      replaceRules: {},
      matchRules: {},
      mappings: {},
      bindings: {} as Record<DataKey, RuleBinding[]>,
      lastUpdated: null,
      isLoading: false,

      setReplaceRule: (label, match, replace) => {
        set((state) => ({
          replaceRules: { ...state.replaceRules, [label]: [match, replace] },
          lastUpdated: Date.now(),
        }));
      },

      setMatchRule: (label, regex) => {
        set((state) => ({
          matchRules: { ...state.matchRules, [label]: regex },
          lastUpdated: Date.now(),
        }));
      },

      setMapping: (label, mapping) => {
        set((state) => ({
          mappings: { ...state.mappings, [label]: mapping },
          lastUpdated: Date.now(),
        }));
      },

      addBinding: (dataKey, binding) => {
        set((state) => ({
          bindings: {
            ...state.bindings,
            [dataKey]: [...(state.bindings[dataKey] || []), binding],
          },
          lastUpdated: Date.now(),
        }));
      },

      updateBinding: (dataKey, index, binding) => {
        set((state) => {
          const currentBindings = state.bindings[dataKey] || [];
          const newBindings = [...currentBindings];
          newBindings[index] = binding;
          return {
            bindings: { ...state.bindings, [dataKey]: newBindings },
            lastUpdated: Date.now(),
          };
        });
      },

      removeBinding: (dataKey, index) => {
        set((state) => {
          const currentBindings = state.bindings[dataKey] || [];
          const newBindings = currentBindings.filter((_, i) => i !== index);
          return {
            bindings: { ...state.bindings, [dataKey]: newBindings },
            lastUpdated: Date.now(),
          };
        });
      },

      reorderBindingRules: (dataKey, bindingIndex, fromRuleIndex, toRuleIndex) => {
        set((state) => {
          const currentBindings = state.bindings[dataKey] || [];
          const binding = currentBindings[bindingIndex];
          if (!binding) return state;

          const newRules = [...binding.rules];
          const [movedRule] = newRules.splice(fromRuleIndex, 1);
          newRules.splice(toRuleIndex, 0, movedRule);

          const newBindings = [...currentBindings];
          newBindings[bindingIndex] = { ...binding, rules: newRules };

          return {
            bindings: { ...state.bindings, [dataKey]: newBindings },
            lastUpdated: Date.now(),
          };
        });
      },

      getBindings: (dataKey) => get().bindings[dataKey] || [],

      deleteRule: (label) => {
        set((state) => {
          const newReplaceRules = { ...state.replaceRules };
          const newMatchRules = { ...state.matchRules };
          const newMappings = { ...state.mappings };
          delete newReplaceRules[label];
          delete newMatchRules[label];
          delete newMappings[label];
          return {
            replaceRules: newReplaceRules,
            matchRules: newMatchRules,
            mappings: newMappings,
            lastUpdated: Date.now(),
          };
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      clearAll: () =>
        set({
          replaceRules: {},
          matchRules: {},
          mappings: {},
          bindings: {} as Record<DataKey, RuleBinding[]>,
          lastUpdated: null,
        }),

      loadRulesFromFile: async () => {
        const state = get();
        
        // Only load if cache is empty (no rules and no bindings)
        const hasRules = Object.keys(state.replaceRules).length > 0 || 
                        Object.keys(state.matchRules).length > 0 || 
                        Object.keys(state.mappings).length > 0;
        const hasBindings = Object.keys(state.bindings).length > 0;
        
        if (hasRules || hasBindings) {
          console.log('Rules already loaded from cache, skipping file load');
          return;
        }

        set({ isLoading: true });
        try {
          const data = await loadRulesFile();

          if (data) {
            set({
              replaceRules: data.replaceRules || {},
              matchRules: data.matchRules || {},
              mappings: data.mappings || {},
              bindings: data.bindings || ({} as Record<DataKey, RuleBinding[]>),
              lastUpdated: Date.now(),
              isLoading: false,
            });
            console.log('Loaded rules from /clean/rules.json');
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Error loading rules file:', error);
          set({ isLoading: false });
        }
      },

      saveToFile: () => {
        const { replaceRules, matchRules, mappings, bindings } = get();
        const data: RulesData = { replaceRules, matchRules, mappings, bindings };
        downloadRulesFile(data);
      },
    }),
    { name: 'rules-cache' }
  )
);

export default useRulesStore;
