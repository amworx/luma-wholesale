import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Reset the viewport to the top whenever the route changes. Without this,
 *  navigating from a scrolled category grid lands mid-page on the product. */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search]);
  return null;
}
