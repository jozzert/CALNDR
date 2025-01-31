import { useLocation } from 'react-router-dom';

export default function GlobalNav() {
  const location = useLocation();
  
  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = isActivePath(item.href);
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
            <item.icon
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