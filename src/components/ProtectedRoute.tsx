import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    console.log('=== ProtectedRoute Auth Check Start ===');
    async function checkAuth() {
      try {
        console.log('1. Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('2. Auth error:', error);
          setIsAuthenticated(false);
          return;
        }

        console.log('3. Session status:', {
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('4. Unexpected error:', error);
        setIsAuthenticated(false);
      }
    }

    checkAuth();
  }, []);

  console.log('5. ProtectedRoute render state:', { isAuthenticated, pathname: location.pathname });

  if (isAuthenticated === null) {
    console.log('6. Still checking auth...');
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('7. Not authenticated, redirecting to login...');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('8. Authenticated, rendering outlet');
  return <Outlet />;
}