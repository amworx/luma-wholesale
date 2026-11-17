import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from '@/components/ui/Toast';
import { CartProvider } from '@/state/CartContext';
import { FavoritesProvider } from '@/state/FavoritesContext';
import { ScrollToTop } from './components/layout/ScrollToTop';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ScrollToTop />
      <ToastProvider>
        <CartProvider>
          <FavoritesProvider>
            <App />
          </FavoritesProvider>
        </CartProvider>
      </ToastProvider>
    </HashRouter>
  </StrictMode>
);

// Register the PWA service worker for offline support / Android install.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  });
}
