import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Node MSW server used by all Vitest tests.
 * The browser service‑worker (browser.ts) is used only in the dev environment.
 */
export const server = setupServer(...handlers);
