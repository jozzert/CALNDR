import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Calendar, Users, Settings } from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Teams', href: '/teams', icon: Users },
  { name: 'Organization', href: '/organization', icon: Settings },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function GlobalNav() {
  const location = useLocation();
  
  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    // Check if the current path starts with the nav item path
    // This ensures /teams/new will highlight the Teams nav item
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = isActivePath(item.href);
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            to={item.href}
            className={classNames(
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
            )}
          >
            <Icon
              className={classNames(
                isActive
                  ? 'text-gray-500'
                  : 'text-gray-400 group-hover:text-gray-500',
                'mr-3 flex-shrink-0 h-6 w-6'
              )}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
} 