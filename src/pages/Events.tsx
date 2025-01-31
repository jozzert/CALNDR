import React, { useState, useEffect } from 'react';
import { format, parseISO, isSameMonth, isSameDay } from 'date-fns';
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
  response_count: {
    yes: number;
    no: number;
    maybe: number;
  };
}

interface MonthGroup {
  month: Date;
  events: Event[];
  isExpanded: boolean;
}

export default function Events() {
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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
          ),
          event_responses (status)
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

      const eventsWithCounts = data.map(event => {
        const responses = event.event_responses || [];
        const responseCounts = responses.reduce((acc: { [key: string]: number }, response: { status: string }) => {
          acc[response.status] = (acc[response.status] || 0) + 1;
          return acc;
        }, { yes: 0, no: 0, maybe: 0 });

        return {
          ...event,
          response_count: responseCounts
        };
      });

      setEvents(eventsWithCounts);
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
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your team events
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Grid View
            </button>
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

      {events.length === 0 ? (
        <div className="text-center py-12">
          <CalendarClock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
        </div>
      ) : viewMode === 'list' ? (
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
                  {group.events.map((event) => {
                    const start = parseISO(event.start_time);
                    const end = parseISO(event.end_time);
                    
                    return (
                      <div
                        key={event.id}
                        className="p-6 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          // Don't modify the event dates when opening the modal
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
                              <div className="text-sm text-gray-500">
                                {isSameDay(start, end) ? (
                                  <>All day on {format(start, 'MMM d, yyyy')}</>
                                ) : (
                                  <>All day from {format(start, 'MMM d')} to {format(end, 'MMM d, yyyy')}</>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {format(start, 'MMM d, h:mm a')}
                                {' - '}
                                {isSameDay(start, end) ? 
                                  format(end, 'h:mm a') : 
                                  format(end, 'MMM d, h:mm a, yyyy')
                                }
                              </div>
                            )}
                          </div>
                        </div>
                        {event.description && (
                          <p className="mt-2 text-sm text-gray-500">{event.description}</p>
                        )}
                        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            {event.response_count.yes} confirmed
                          </span>
                          <span>
                            {event.response_count.maybe} maybe
                          </span>
                          <span>
                            {event.response_count.no} declined
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const start = parseISO(event.start_time);
            const end = parseISO(event.end_time);
            const isMultiDay = !isSameDay(start, end);

            return (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventForm(true);
                }}
              >
                <div
                  className="h-2 rounded-t-lg"
                  style={{ backgroundColor: event.event_type.color }}
                />
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: event.event_type.color + '20',
                        color: event.event_type.color
                      }}
                    >
                      {event.event_type.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {event.team.name}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-medium text-gray-900">
                    {event.title}
                  </h3>

                  {/* Date/Time */}
                  <div className="text-sm text-gray-500">
                    {event.is_all_day ? (
                      isMultiDay ? (
                        <>
                          All day from {format(start, 'MMM d')} to {format(end, 'MMM d, yyyy')}
                        </>
                      ) : (
                        <>All day on {format(start, 'MMM d, yyyy')}</>
                      )
                    ) : (
                      isMultiDay ? (
                        <>
                          {format(start, 'MMM d, h:mm a')}
                          {' - '}
                          {format(end, 'MMM d, h:mm a, yyyy')}
                        </>
                      ) : (
                        <>
                          {format(start, 'MMM d, yyyy')}
                          <br />
                          {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                        </>
                      )
                    )}
                  </div>

                  {/* Location */}
                  {event.location && (
                    <div className="text-sm text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location}
                    </div>
                  )}

                  {/* Description */}
                  {event.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  {/* Response counts */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
                    <div className="flex items-center space-x-4">
                      <span>{event.response_count.yes} confirmed</span>
                      <span>{event.response_count.maybe} maybe</span>
                    </div>
                    <span>{event.response_count.no} declined</span>
                  </div>
                </div>
              </div>
            );
          })}
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