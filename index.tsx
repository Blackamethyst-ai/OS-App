import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { initializeCapabilities } from './services/capabilities';
import { logger } from './services/logger';
import { reportWebVitals } from './services/webVitals';

const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </StrictMode>
    );
  }
};

// Initialize capability registry before rendering
initializeCapabilities().then(() => {
  renderApp();
}).catch((error) => {
  logger.error('Failed to initialize capabilities:', error);
  // Still render the app even if capabilities fail
  renderApp();
});

// Report Core Web Vitals (LCP, FID, CLS)
reportWebVitals();