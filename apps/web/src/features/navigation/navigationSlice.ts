import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';

const DEFAULT_NOTES_PANEL_WIDTH = 320;

/** The `ui` storage key (contracts/client-storage-and-external.md): layout kept on this device. */
export const uiLayoutSchema = z.object({
  collapsedModules: z.record(z.string(), z.array(z.string())),
  notesPanelWidth: z.number().int().positive(),
});
export type UiLayout = z.infer<typeof uiLayoutSchema>;

interface NavigationState {
  mobileMenuOpen: boolean;
  layout: UiLayout;
}

export function initialNavigationState(layout: UiLayout | null): NavigationState {
  return {
    mobileMenuOpen: false,
    layout: layout ?? { collapsedModules: {}, notesPanelWidth: DEFAULT_NOTES_PANEL_WIDTH },
  };
}

const navigationSlice = createSlice({
  name: 'navigation',
  initialState: initialNavigationState(null),
  reducers: {
    setMobileMenuOpen(state, action: PayloadAction<boolean>) {
      state.mobileMenuOpen = action.payload;
    },
    notesPanelResized(state, action: PayloadAction<number>) {
      state.layout.notesPanelWidth = Math.round(action.payload);
    },
    moduleToggled(state, action: PayloadAction<{ courseId: string; moduleId: string }>) {
      const { courseId, moduleId } = action.payload;
      const collapsed = state.layout.collapsedModules[courseId] ?? [];
      const next = collapsed.includes(moduleId) ? collapsed.filter((id) => id !== moduleId) : [...collapsed, moduleId];
      if (next.length > 0) state.layout.collapsedModules[courseId] = next;
      else delete state.layout.collapsedModules[courseId];
    },
  },
});

export const { setMobileMenuOpen, moduleToggled, notesPanelResized } = navigationSlice.actions;
export const navigationReducer = navigationSlice.reducer;

export const selectMobileMenuOpen = (state: { navigation: NavigationState }): boolean =>
  state.navigation.mobileMenuOpen;

export const selectUiLayout = (state: { navigation: NavigationState }): UiLayout => state.navigation.layout;

const NO_COLLAPSED: string[] = [];

export const selectCollapsedModules =
  (courseId: string) =>
  (state: { navigation: NavigationState }): string[] =>
    state.navigation.layout.collapsedModules[courseId] ?? NO_COLLAPSED;
