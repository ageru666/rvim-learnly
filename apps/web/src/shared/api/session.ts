import { createAction } from '@reduxjs/toolkit';

/**
 * Dispatched by the base query when a session cannot be refreshed. Defined in `shared` so the
 * API layer stays independent of features; the auth feature reacts to it in its slice.
 */
export const sessionExpired = createAction('session/expired');
