import type { Show } from './types';

export interface RecommendedShow extends Show {
  originalTitle: string;
  year: string;
  // 海报放在 public/posters/ 下（friends.jpeg / modern-family.jpeg），缺失时显示渐变占位
  poster: string;
  accent: string;
}

export const RECOMMENDED_SHOWS: RecommendedShow[] = [
  {
    id: 'friends',
    title: '老友记',
    originalTitle: 'Friends',
    year: '1994',
    poster: '/posters/friends.jpeg',
    accent: 'from-amber-300 via-rose-500 to-rose-800',
  },
  {
    id: 'modern-family',
    title: '摩登家庭',
    originalTitle: 'Modern Family',
    year: '2009',
    poster: '/posters/modern-family.jpeg',
    accent: 'from-teal-300 via-emerald-500 to-sky-800',
  },
];
