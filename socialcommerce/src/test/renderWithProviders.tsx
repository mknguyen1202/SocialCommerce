import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

interface Options extends Omit<RenderOptions, 'wrapper'> {
    routerProps?: MemoryRouterProps;
}

/**
 * Creates a fresh QueryClient (retry=false so errors surface immediately in tests)
 * wrapped in MemoryRouter.  A new client is created for every call so cached data
 * from one test never bleeds into the next.
 */
export function renderWithProviders(
    ui: React.ReactElement,
    { routerProps, ...options }: Options = {},
) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter {...routerProps}>{children}</MemoryRouter>
        </QueryClientProvider>
    );

    return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient };
}

/**
 * Returns a renderHook‑compatible wrapper with a fresh QueryClient + MemoryRouter.
 * Pass the returned object directly to renderHook's `wrapper` option.
 */
export function createWrapper(routerProps?: MemoryRouterProps) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter {...routerProps}>{children}</MemoryRouter>
        </QueryClientProvider>
    );

    return { Wrapper, queryClient };
}
