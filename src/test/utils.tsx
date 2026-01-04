import React from 'react';
import { 
  render as rtlRender, 
  RenderOptions,
  renderHook,
  cleanup,
  act
} from '@testing-library/react';
import { 
  screen,
  fireEvent,
  waitFor,
  within
} from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders = ({ children }: AllProvidersProps) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: AllProviders, ...options });

// Re-export specific items for type safety
export { 
  customRender as render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  renderHook,
  cleanup,
  userEvent
};
