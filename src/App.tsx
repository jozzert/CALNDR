import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CalendarView from './pages/Calendar';
import Events from './pages/Events';
import Teams from './pages/Teams';
import OrganizationSettings from './pages/OrganizationSettings';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { supabase } from './lib/supabase';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({error}: {error: Error}) {
  return (
    <div className="p-4 text-red-600">
      <h1>Something went wrong</h1>
      <pre className="mt-2 text-sm">{error.message}</pre>
      <pre className="mt-2 text-xs">{error.stack}</pre>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log('=== App Initialization Start ===');
    async function init() {
      try {
        console.log('1. Checking auth session...');
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Auth error:', sessionError);
          setError('Authentication failed');
          return;
        }

        console.log('2. Session data:', {
          hasSession: !!data.session,
          userId: data.session?.user?.id
        });
        
        setInitialized(true);
      } catch (error) {
        console.error('3. Initialization error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        console.log('4. Setting loading to false');
        setIsLoading(false);
      }
    }

    init();
  }, []);

  console.log('5. App render state:', { isLoading, error, initialized });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="p-4 text-amber-600">
        <h1>Loading...</h1>
        <p>Application is initializing...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/events" element={<Events />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/organization" element={<OrganizationSettings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;