import React, { useState, useEffect } from 'react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { CalendarClock, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EventForm from '../components/EventForm';
import EventFilters from '../components/EventFilters';

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location: string;
  event_type: {
    id: string;
    name: string;
    color: string;
  };
  team: {
    id: string;
    name: string;
  };
}

interface MonthGroup {
  month: Date;
  events: Event[];
  isExpanded: boolean;
}

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string; }[]>([]);
  const [eventTypes, setEventTypes] = useState<{ id: string; name: string; color: string; }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');

  useEffect(() => {
    Promise.all([fetchTeams(), fetchEventTypes()]).then(() => {
      fetchEvents();
    });
  }, [selectedTeam, selectedEventType]);

  useEffect(() => {
    // Group events by month when events change
    const groups = groupEventsByMonth(events);
    setMonthGroups(groups);
  }, [events]);

  function groupEventsByMonth(events: Event[]): MonthGroup[] {
    const groups: { [key: string]: Event[] } = {};
    
    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Group events by month
    sortedEvents.forEach(event => {
      const monthKey = format(parseISO(event.start_time), 'yyyy-MM');
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(event);
    });

    // Convert to array and add isExpanded property
    return Object.entries(groups).map(([monthKey, monthEvents]) => ({
      month: parseISO(`${monthKey}-01`),
      events: monthEvents,
      isExpanded: true // Start expanded by default
    }));
  }

  async function fetchTeams() {
    try {
      const { data: userTeams } = await supabase
        .from('team_members')
        .select('teams (id, name)')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (userTeams) {
        const teams = userTeams
          .map(ut => ut.teams)
          .filter((team): team is { id: string; name: string } => team !== null);
        setTeams(teams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }

  async function fetchEventTypes() {
    try {
      const { data: organisationData } = await supabase
        .from('team_members')
        .select('teams(organisation_id)')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (organisationData?.teams?.organisation_id) {
        const { data } = await supabase
          .from('event_types')
          .select('*')
          .eq('organisation_id', organisationData.teams.organisation_id)
          .order('name');

        if (data) {
          setEventTypes(data);
        }
      }
    } catch (error) {
      console.error('Error fetching event types:', error);
    }
  }

  async function fetchEvents() {
    try {
      // Get user's teams first
      const { data: userTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (!userTeams?.length) {
        setError('No teams found');
        setLoading(false);
        return;
      }

      const teamIds = userTeams.map(t => t.team_id);

      // Build the query
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          is_all_day,
          location,
          event_type:event_types (
            id,
            name,
            color
          ),
          team:teams (
            id,
            name
          )
        `)
        .in('team_id', teamIds)
        .order('start_time', { ascending: true });

      // Apply filters if selected
      if (selectedTeam) {
        query = query.eq('team_id', selectedTeam);
      }

      if (selectedEventType) {
        query = query.eq('event_type_id', selectedEventType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  const toggleMonthExpanded = (monthIndex: number) => {
    setMonthGroups(current =>
      current.map((group, index) =>
        index === monthIndex
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event List</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your team events
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setShowEventForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Event
        </button>
      </div>

      <div className="mb-6">
        <EventFilters
          teams={teams}
          eventTypes={eventTypes}
          selectedTeam={selectedTeam}
          selectedEventType={selectedEventType}
          onTeamChange={setSelectedTeam}
          onEventTypeChange={setSelectedEventType}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {monthGroups.length === 0 ? (
        <div className="text-center py-12">
          <CalendarClock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {monthGroups.map((group, groupIndex) => (
            <div key={format(group.month, 'yyyy-MM')} className="bg-white shadow sm:rounded-lg overflow-hidden">
              <button
                onClick={() => toggleMonthExpanded(groupIndex)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900">
                  {format(group.month, 'MMMM yyyy')}
                </h3>
                {group.isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {group.isExpanded && (
                <div className="divide-y divide-gray-200">
                  {group.events.map((event) => (
                    <div
                      key={event.id}
                      className="p-6 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventForm(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.event_type.color }}
                          ></div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {event.title}
                            </h3>
                            <div className="mt-1 text-sm text-gray-500">
                              <span className="font-medium">{event.team.name}</span>
                              {event.location && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>{event.location}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {event.is_all_day ? (
                            format(parseISO(event.start_time), 'MMM d, yyyy')
                          ) : (
                            <>
                              {format(parseISO(event.start_time), 'MMM d, yyyy h:mm a')}
                              {' - '}
                              {format(parseISO(event.end_time), 'h:mm a')}
                            </>
                          )}
                        </div>
                      </div>
                      {event.description && (
                        <p className="mt-2 text-sm text-gray-500">{event.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEventForm && (
        <EventForm
          selectedDate={selectedEvent ? parseISO(selectedEvent.start_time) : new Date()}
          event={selectedEvent || undefined}
          onClose={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            fetchEvents();
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}