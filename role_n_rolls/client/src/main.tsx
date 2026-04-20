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
// Push the persisted theme colors onto :root before the first render so the
// app never flashes with the default palette.
applyThemeToDocument(useTheme.getState().colors);
useTheme.subscribe((s) => applyThemeToDocument(s.colors));

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
