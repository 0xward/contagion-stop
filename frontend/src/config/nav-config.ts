import { NavGroup } from '@/types';

/**
 * Navigasi ContagionStop — sengaja minimal: satu halaman utama (Overview)
 * + Docs. Seksi dashboard (hero, grid sibling, timeline, tabel incident,
 * aksi) semuanya hidup di halaman Overview dan dibuat oleh worker komponen.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        title: 'Overview',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Docs',
        url: '/dashboard/docs',
        icon: 'page',
        isActive: false,
        items: []
      }
    ]
  }
];
