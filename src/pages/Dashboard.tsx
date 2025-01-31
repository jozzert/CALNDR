import React, { useEffect, useState } from 'react';
import { CalendarDays, Users, CalendarClock, Plus, RefreshCw, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';

interface DashboardStats {
  totalEvents: number;
  activeTeams: number;
  upcomingEvents: number;
  trends: {
    totalEvents: number;
    activeTeams: number;
    upcomingEvents: number;
  };
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  team: {
    name: string;
  };
}

interface HistoricalStats {
  totalEvents: number;
  activeTeams: number;
  upcomingEvents: number;
  timestamp: string;
}

function calculateTrend(currentValue: number, previousValue: number): number {
  if (previousValue === 0) return 0;
  const percentageChange = ((currentValue - previousValue) / previousValue) * 100;
  return Math.round(percentageChange);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    activeTeams: 0,
    upcomingEvents: 0,
    trends: {
      totalEvents: 0,
      activeTeams: 0,
      upcomingEvents: 0,
    },
  });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const now = new Date().toISOString();
        const lastWeek = addDays(new Date(), -7).toISOString();
        const nextWeek = addDays(new Date(), 7).toISOString();

        // Get user's teams first
        const { data: userTeams } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (!userTeams?.length) {
          setError('No teams found. Please contact an administrator.');
          setLoading(false);
          return;
        }

        const teamIds = userTeams.map(t => t.team_id);

        // Fetch current and historical data
        const [
          { data: allEvents },
          { data: teams },
          { data: upcomingEventsData },
          { data: recentEventsData },
          { data: historicalEvents }
        ] = await Promise.all([
          supabase
            .from('events')
            .select('id')
            .in('team_id', teamIds),
          supabase
            .from('teams')
            .select('id')
            .in('id', teamIds),
          supabase
            .from('events')
            .select('id')
            .in('team_id', teamIds)
            .gte('start_time', now)
            .lte('start_time', nextWeek),
          supabase
            .from('events')
            .select(`
              id,
              title,
              start_time,
              team:teams (name)
            `)
            .in('team_id', teamIds)
            .gte('start_time', now)
            .order('start_time')
            .limit(5),
          // Historical data from last week
          supabase
            .from('events')
            .select('id')
            .in('team_id', teamIds)
            .gte('start_time', lastWeek)
            .lt('start_time', now)
        ]);

        const currentStats = {
          totalEvents: allEvents?.length || 0,
          activeTeams: teams?.length || 0,
          upcomingEvents: upcomingEventsData?.length || 0,
        };

        const previousStats = {
          totalEvents: historicalEvents?.length || 0,
          activeTeams: teams?.length || 0, // Teams don't change as frequently
          upcomingEvents: historicalEvents?.length || 0,
        };

        setStats({
          ...currentStats,
          trends: {
            totalEvents: calculateTrend(currentStats.totalEvents, previousStats.totalEvents),
            activeTeams: calculateTrend(currentStats.activeTeams, previousStats.activeTeams),
            upcomingEvents: calculateTrend(currentStats.upcomingEvents, previousStats.upcomingEvents),
          },
        });

        setRecentEvents(recentEventsData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [refreshKey]);

  const handleNewEvent = async () => {
    setActionLoading('event');
    try {
      setShowEventForm(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleNewTeam = () => {
    navigate('/teams/new');
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  const statItems = [
    { name: 'Total Events', key: 'totalEvents', value: stats.totalEvents.toString(), icon: CalendarClock },
    { name: 'Active Teams', key: 'activeTeams', value: stats.activeTeams.toString(), icon: Users },
    { name: 'Upcoming Events', key: 'upcomingEvents', value: stats.upcomingEvents.toString(), icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to your team calendar dashboard
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statItems.map((stat) => {
          const Icon = stat.icon;
          const trend = stats.trends[stat.key as keyof typeof stats.trends];
          
          return (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
            >
              <dt>
                <div className="absolute rounded-md bg-indigo-500 p-3">
                  <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">
                  {stat.name}
                </p>
              </dt>
              <dd className="ml-16 flex items-baseline justify-between">
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
                {trend !== 0 && (
                  <p className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                  </p>
                )}
              </dd>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900">
              Upcoming Events
            </h2>
            <div className="mt-6 flow-root">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
              ) : (
                <ul className="-my-5 divide-y divide-gray-200">
                  {recentEvents.map((event) => (
                    <li 
                      key={event.id} 
                      className="py-4 hover:bg-gray-50 cursor-pointer transition-colors rounded-md px-2"
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventForm(true);
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {event.title}
                          </p>
                          <p className="truncate text-sm text-gray-500">
                            {event.team.name} • {format(new Date(event.start_time), 'PPp')}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900">
              Quick Actions
            </h2>
            <div className="mt-6 flow-root">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleNewEvent}
                  disabled={actionLoading === 'event'}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {actionLoading === 'event' ? (
                    <Loader className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5 mr-2" />
                  )}
                  New Event
                </button>
                <button 
                  onClick={handleNewTeam}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Users className="h-5 w-5 mr-2" />
                  New Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Form Modal */}
      {showEventForm && (
        <EventForm
          selectedDate={new Date()}
          onClose={() => setShowEventForm(false)}
          onSuccess={() => {
            setShowEventForm(false);
            fetchDashboardData(); // Refresh dashboard data
          }}
        />
      )}
    </div>
  );
}