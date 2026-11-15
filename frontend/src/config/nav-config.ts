import { NavGroup } from '@/types';

/**
 * ContagionStop navigation — intentionally minimal: one main page
 * (Overview) + Docs. All dashboard sections (hero, sibling grid,
 * timeline, incident table, actions) live on the Overview page.
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
        title: 'Deploy your own',
        url: '/dashboard/deploy',
        icon: 'add',
        isActive: false,
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
