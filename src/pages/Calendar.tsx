import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, isSameMonth, isToday, isWithinInterval, isSameDay, addMonths, subMonths, setMonth, setYear } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, AlertTriangle, DotsVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EventForm from '../components/EventForm';
import EventFilters from '../components/EventFilters';
import { Event } from '../types';
import { downloadCalendar } from '../utils/calendarExport';
import { Menu, Dialog } from '@headlessui/react';
import { Toaster, toast } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';

interface DayEvent {
  event: Event;
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
}

function ErrorFallback({error}: {error: Error}) {
  return (
    <div className="p-4 text-red-600">
      <h1>Something went wrong.</h1>
      <pre className="mt-2 text-sm">{error.message}</pre>
    </div>
  );
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(startOfMonth(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string; }[]>([]);
  const [eventTypes, setEventTypes] = useState<{ id: string; name: string; color: string; }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingExportOptions, setPendingExportOptions] = useState<ExportOptions | null>(null);

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const startDate = startOfWeek(firstDayOfMonth);
  const endDate = endOfWeek(lastDayOfMonth);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  useEffect(() => {
    console.log('Fetching initial data...');
    Promise.all([fetchTeams(), fetchEventTypes()]).then(() => {
      console.log('Teams and event types fetched, now fetching events...');
      fetchEvents();
    }).catch(error => {
      console.error('Error in initial data fetch:', error);
      setError('Failed to load calendar data');
    });
  }, [currentDate, selectedTeam, selectedEventType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePreviousMonth();
      } else if (e.key === 'ArrowRight') {
        handleNextMonth();
      } else if (e.key === 'Home') {
        handleToday();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function fetchTeams() {
    try {
      console.log('Fetching teams...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data: userTeams, error } = await supabase
        .from('team_members')
        .select('teams (id, name)')
        .eq('user_id', user.id);

      if (error) throw error;

      if (userTeams) {
        const teams = userTeams.map(ut => ut.teams).filter(Boolean);
        console.log('Teams fetched:', teams);
        setTeams(teams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
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
          event_type:event_types(id, name, color),
          team:teams(id, name)
        `)
        .or(`start_time.gte.${startDate.toISOString()},end_time.gte.${startDate.toISOString()}`)
        .lt('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (selectedTeam) {
        query = query.eq('team_id', selectedTeam);
      }

      if (selectedEventType) {
        query = query.eq('event_type_id', selectedEventType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  const getEventsForDay = (date: Date): DayEvent[] => {
    return events
      .filter(event => {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);
        return isWithinInterval(date, { start: eventStart, end: eventEnd }) ||
               isSameDay(date, eventStart) ||
               isSameDay(date, eventEnd);
      })
      .map(event => {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);
        return {
          event,
          isStart: isSameDay(date, eventStart),
          isEnd: isSameDay(date, eventEnd),
          isMiddle: !isSameDay(date, eventStart) && !isSameDay(date, eventEnd) &&
                   isWithinInterval(date, { start: eventStart, end: eventEnd }),
        };
      })
      .sort((a, b) => {
        if (a.event.is_all_day !== b.event.is_all_day) {
          return a.event.is_all_day ? -1 : 1;
        }
        return new Date(a.event.start_time).getTime() - new Date(b.event.start_time).getTime();
      });
  };

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDate(parseISO(event.start_time));
    setShowEventForm(true);
  };

  const renderEventCell = (dayEvent: DayEvent) => {
    const { event, isStart, isEnd, isMiddle } = dayEvent;
    const eventStart = parseISO(event.start_time);
    const eventEnd = parseISO(event.end_time);

    let timeDisplay = '';
    if (!event.is_all_day) {
      if (isStart) {
        timeDisplay = format(eventStart, 'HH:mm');
      }
    }

    const roundedClasses = [
      isStart ? 'rounded-l-sm' : '',
      isEnd ? 'rounded-r-sm' : '',
      isMiddle ? 'border-l border-r border-white/10' : '',
    ].join(' ');

    return (
      <div
        key={`${event.id}-${isStart ? 'start' : isEnd ? 'end' : 'middle'}`}
        onClick={(e) => handleEventClick(event, e)}
        className={`
          group relative px-2 py-1 text-sm rounded-md truncate
          ${isStart ? 'ml-1' : '-ml-1'}
          ${isEnd ? 'mr-1' : '-mr-1'}
          ${getEventTypeColor(event.event_type.color)}
          hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500
          transition-all duration-150
        `}
      >
        <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 
          text-sm bg-white rounded-lg shadow-lg border border-gray-200
          -translate-y-full left-0">
          <p className="font-semibold">{event.title}</p>
          <p className="text-gray-600">{event.description}</p>
          <p className="text-gray-500 text-xs mt-1">
            {format(eventStart, 'h:mm a')} - 
            {format(eventEnd, 'h:mm a')}
          </p>
        </div>
        {event.title}
      </div>
    );
  };

  const handlePreviousMonth = () => {
    setCurrentDate(startOfMonth(subMonths(currentDate, 1)));
  };

  const handleNextMonth = () => {
    setCurrentDate(startOfMonth(addMonths(currentDate, 1)));
  };

  const handleToday = () => {
    setCurrentDate(startOfMonth(new Date()));
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(currentDate, monthIndex);
    setCurrentDate(startOfMonth(newDate));
  };

  const handleExportCalendar = async (newEventsOnly: boolean) => {
    try {
      const options = {
        selectedTeam,
        selectedEventType,
        newEventsOnly,
      };

      const { requiresConfirmation } = await downloadCalendar(events, options);
      
      if (requiresConfirmation) {
        setShowDuplicateWarning(true);
        setPendingExportOptions(options);
      }
      toast.success(
        newEventsOnly ? 'New events exported successfully' : 'All events exported successfully'
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'No new events to export') {
        toast.info('No new events to export');
      } else {
        toast.error('Failed to export calendar');
      }
    }
  };

  const handleConfirmedExport = async () => {
    if (!pendingExportOptions) return;
    
    try {
      await downloadCalendar(events, { ...pendingExportOptions, force: true });
      setShowDuplicateWarning(false);
      setPendingExportOptions(null);
    } catch (error) {
      setError('Failed to export calendar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Team Calendar</h1>
          <div className="flex items-center space-x-4">
            <Menu as="div" className="relative">
              <Menu.Button className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <Download className="h-4 w-4 mr-1.5" />
                Export Calendar
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleExportCalendar(false)}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                      >
                        Export All Events
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleExportCalendar(true)}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                      >
                        Export New Events Only
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
            <Menu as="div" className="relative">
              <Menu.Button className="rounded-full p-2 hover:bg-gray-100">
                <DotsVertical className="h-5 w-5 text-gray-500" />
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleToday}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                    >
                      Go to Today
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setShowEventForm(true)}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } block px-4 py-2 text-sm text-gray-700 w-full text-left`}
                    >
                      Create Event
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
            <button
              onClick={handleToday}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              Today
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center space-x-1 px-2 py-1 text-xl font-semibold hover:bg-gray-100 rounded-md">
                  <span>{format(currentDate, 'MMMM yyyy')}</span>
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </Menu.Button>
                <Menu.Items className="absolute z-10 mt-1 w-48 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-3 py-2 border-b">
                    <select 
                      value={format(currentDate, 'yyyy')}
                      onChange={(e) => {
                        const newDate = setYear(currentDate, parseInt(e.target.value));
                        setCurrentDate(startOfMonth(newDate));
                      }}
                      className="w-full rounded-md border-gray-300"
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-2">
                    {months.map((month, index) => (
                      <Menu.Item key={month}>
                        {({ active }) => (
                          <button
                            onClick={() => handleMonthSelect(index)}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } ${
                              format(currentDate, 'MMMM') === month ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
                            } px-2 py-1 text-sm rounded-md w-full text-center`}
                          >
                            {month.slice(0, 3)}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Menu>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
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
          <div className="rounded-md bg-red-50 p-4 mb-8">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded my-2 mx-1"></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No events found for this period</p>
            <button
              onClick={() => setShowEventForm(true)}
              className="mt-2 text-indigo-600 hover:text-indigo-500"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="calendar-grid grid grid-cols-1 sm:grid-cols-7 gap-px bg-gray-200">
              {/* Weekday headers - hide on mobile */}
              <div className="hidden sm:grid sm:grid-cols-7 sm:gap-px">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="bg-gray-50 py-2">
                    <p className="text-sm font-medium text-gray-500 text-center">
                      {day}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Mobile view - show current week only by default */}
              <div className="sm:hidden">
                <select 
                  value={currentWeek} 
                  onChange={(e) => setCurrentWeek(e.target.value)}
                  className="block w-full rounded-md border-gray-300"
                >
                  {weeks.map((week, i) => (
                    <option key={i} value={i}>
                      Week {i + 1} ({format(week.start, 'MMM d')} - {format(week.end, 'MMM d')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {days.map((date) => {
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isCurrentDate = isToday(date);
                const isHovered = hoveredDate?.getTime() === date.getTime();
                const dayEvents = getEventsForDay(date);

                return (
                  <div
                    key={date.toString()}
                    className={`min-h-32 bg-white transition-all duration-200 ease-in-out cursor-pointer
                      ${!isCurrentMonth ? 'bg-gray-50' : ''}
                      ${isCurrentDate ? 'bg-blue-50' : ''}
                      ${isHovered ? 'bg-indigo-50 shadow-inner' : ''}
                      hover:bg-indigo-50 hover:shadow-inner
                      group relative
                    `}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedEvent(null);
                      setShowEventForm(true);
                    }}
                    onMouseEnter={() => setHoveredDate(date)}
                    onMouseLeave={() => setHoveredDate(null)}
                  >
                    <div className="px-2 py-1">
                      <span
                        className={`text-sm inline-flex items-center justify-center w-6 h-6 rounded-full
                          ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                          ${isCurrentDate ? 'bg-blue-600 text-white' : ''}
                          ${isHovered && !isCurrentDate ? 'bg-indigo-100' : ''}
                          group-hover:bg-indigo-100
                          transition-colors duration-200
                        `}
                      >
                        {format(date, 'd')}
                      </span>
                    </div>
                    <div className="px-1">
                      {dayEvents.map((dayEvent) => renderEventCell(dayEvent))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showEventForm && (
          <EventForm
            selectedDate={selectedDate || new Date()}
            event={selectedEvent || undefined}
            onClose={() => {
              setShowEventForm(false);
              setSelectedDate(null);
              setSelectedEvent(null);
            }}
            onSuccess={() => {
              fetchEvents();
              setShowEventForm(false);
              setSelectedDate(null);
              setSelectedEvent(null);
            }}
          />
        )}

        {/* Add Warning Dialog */}
        <Dialog
          open={showDuplicateWarning}
          onClose={() => setShowDuplicateWarning(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                <Dialog.Title className="text-lg font-medium text-gray-900">
                  Duplicate Events Warning
                </Dialog.Title>
              </div>

              <Dialog.Description className="mt-3 text-sm text-gray-500">
                You have previously downloaded all events. Downloading again may create duplicates in your calendar. 
                Consider using "Export New Events Only" instead.
              </Dialog.Description>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={() => setShowDuplicateWarning(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={handleConfirmedExport}
                >
                  Download Anyway
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
        <Toaster position="bottom-right" />
      </div>
    </ErrorBoundary>
  );
}