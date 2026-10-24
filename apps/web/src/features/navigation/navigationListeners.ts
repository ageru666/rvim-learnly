import type { ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { writeStored } from '../../shared/api/browserStorage';
import { logFailure } from '../../shared/utils/logger';
import { moduleToggled, selectUiLayout } from './navigationSlice';

/** Keeps the `ui` layout (collapsed modules, panel sizes) on this device. */
export function startNavigationListeners(listeners: ListenerMiddlewareInstance): void {
  listeners.startListening({
    actionCreator: moduleToggled,
    effect: (_action, api) => {
      try {
        writeStored('ui', selectUiLayout(api.getState() as Parameters<typeof selectUiLayout>[0]));
      } catch (error) {
        logFailure('remember layout', { error: String(error) });
      }
    },
  });
}
