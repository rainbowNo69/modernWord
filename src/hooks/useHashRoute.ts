import { useEffect, useState } from 'react';

// ABOUTME: 极简 hash 路由（#/shows、#/settings），零依赖
// ABOUTME: 相比纯 state 切换，hash 可刷新、可分享、可前进后退

export type Route = 'home' | 'shows' | 'settings';

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\//, '').split('?')[0];
  if (path === 'shows') return 'shows';
  if (path === 'settings') return 'settings';
  return 'home';
}

export function useHashRoute(): { route: Route; navigate: (next: Route) => void } {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const navigate = (next: Route) => {
    const target = next === 'home' ? '#/' : `#/${next}`;
    if (window.location.hash === target) {
      setRoute(next);
      return;
    }
    window.location.hash = target;
  };

  return { route, navigate };
}
