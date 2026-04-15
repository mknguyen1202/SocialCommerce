import '@testing-library/jest-dom';
import { server } from '../mocks/server';

// Start MSW before any test runs, enforce that every request is handled
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset per-test handler overrides so they don't bleed into the next test
afterEach(() => server.resetHandlers());

// Tear down after all tests in the suite are done
afterAll(() => server.close());
