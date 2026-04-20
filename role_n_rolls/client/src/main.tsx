import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { initAuth } from './stores/auth';
import { applyThemeToDocument, useTheme } from './stores/theme';
import 'gridstack/dist/gridstack.min.css';
import './styles.css';

initAuth();
// Subscribe BEFORE the first apply so any pending persist rehydrate (which
// can fire as a `set` call during module evaluation) is caught. Then push
// the current colours onto :root before the first render so the app never
// flashes the default palette. The listener handles every subsequent user
// change in /settings — no React tree involvement needed, CSS vars cascade.
useTheme.subscribe((s, prev) => {
  if (!prev || s.colors !== prev.colors) applyThemeToDocument(s.colors);
});
applyThemeToDocument(useTheme.getState().colors);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
