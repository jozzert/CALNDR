import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, startOfWeek, endOfWeek, isSameMonth, isToday, isWithinInterval, isSameDay, addMonths, subMonths, setMonth, setYear, eachWeekOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, AlertTriangle, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EventForm from '../components/EventForm';
import { EventModal } from '../components/EventModal';
import EventFilters from '../components/EventFilters';
import { Event } from '../types';
import { downloadCalendar } from '../utils/calendarExport';
import { Menu, Dialog } from '@headlessui/react';
import { Tooltip } from '../components/Tooltip';
import { Toaster, toast } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { eventColors } from '../utils/eventColors';
import { enGB } from 'date-fns/locale';
import { EventTooltip } from '../components/EventTooltip';

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
  console.log('=== Calendar Component Start ===');

  const [currentDate, setCurrentDate] = useState(new Date());
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
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showEventModal, setShowEventModal] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks = eachWeekOfInterval({
    start: calendarStart,
    end: calendarEnd
  }).map(weekStart => ({
    start: weekStart,
    end: endOfWeek(weekStart)
  }));

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  useEffect(() => {
    console.log('1. Calendar mounting...');
    return () => {
      console.log('Calendar unmounting...');
    };
  }, []);

  useEffect(() => {
    console.log('2. Fetching initial data...');
    Promise.all([fetchTeams(), fetchEventTypes()]).then(() => {
      console.log('3. Teams and event types fetched, now fetching events...');
      fetchEvents();
    }).catch(error => {
      console.error('4. Error in initial data fetch:', error);
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
    console.log('5. Fetching teams...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('6. Current user:', user?.id);
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
      console.error('7. Error fetching teams:', error);
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
        .or(`start_time.gte.${calendarStart.toISOString()},end_time.gte.${calendarStart.toISOString()}`)
        .lt('start_time', calendarEnd.toISOString())
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

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create a deep copy of the event to prevent any reference issues
    const eventCopy = {
      ...event,
      start_time: event.start_time,
      end_time: event.end_time,
    };
    
    setSelectedEvent(eventCopy);
    setSelectedDate(parseISO(event.start_time));
    setShowEventForm(true);
  };

  const handleDayClick = (date: Date, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.event-item')) {
      return;
    }
    
    setSelectedDate(date);
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(currentDate, monthIndex);
    setCurrentDate(newDate);
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

  const handleModalClose = () => {
    setShowEventForm(false);
    setSelectedEvent(null);
    setSelectedDate(null);
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
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
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
                <MoreVertical className="h-5 w-5 text-gray-500" />
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

        <div className="flex-1 bg-white rounded-lg shadow">
          <div className="grid grid-cols-7 gap-px border-b border-gray-200">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="h-12 flex items-center justify-center bg-gray-50 px-2 py-2"
              >
                <span className="text-sm font-semibold text-gray-900">
                  {day}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 flex-1 min-h-[600px]">
            {days.map((day) => {
              const formattedDate = format(day, 'yyyy-MM-dd');
              const dayEvents = events.filter(event => {
                const eventStart = parseISO(event.start_time);
                const eventEnd = parseISO(event.end_time);
                const currentDay = day;
                
                return isWithinInterval(currentDay, {
                  start: startOfDay(eventStart),
                  end: endOfDay(eventEnd)
                });
              });

              return (
                <div
                  key={day.toString()}
                  onClick={(e) => handleDayClick(day, e)}
                  className={`
                    min-h-[100px] p-2 relative flex flex-col
                    ${!isSameMonth(day, currentDate) ? 'bg-gray-100' : 'bg-white'}
                    ${isToday(day) ? 'bg-blue-50' : ''}
                    hover:bg-gray-50 transition-colors
                    cursor-pointer
                  `}
                >
                  <span
                    className={`
                      text-sm font-semibold
                      ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-900'}
                      ${isToday(day) ? 'text-blue-600' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>

                  <div className="flex-1 overflow-y-auto mt-1 space-y-1">
                    {dayEvents.map((event) => (
                      <EventTooltip 
                        key={event.id} 
                        event={event}
                        displayDate={day}
                      >
                        <div
                          onClick={(e) => handleEventClick(event, e)}
                          className="
                            event-item
                            relative
                            px-2 py-1 
                            rounded-md 
                            text-sm 
                            shadow-sm
                            hover:shadow
                            transition-all
                            cursor-pointer
                            mb-1
                            w-full
                          "
                          style={{
                            backgroundColor: eventColors.getEventBackground(event.event_type.color),
                            color: event.event_type.color,
                            borderLeft: `4px solid ${event.event_type.color}`
                          }}
                        >
                          <div className="font-medium truncate">
                            {event.title}
                          </div>

                          <div className="flex items-center justify-between text-xs opacity-75">
                            <div>{event.event_type.name}</div>
                            {!event.is_all_day && (
                              <div>
                                {format(parseISO(event.start_time), 'h:mm a')}
                              </div>
                            )}
                          </div>
                        </div>
                      </EventTooltip>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Dialog
          open={showEventForm}
          onClose={handleModalClose}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-xl w-full bg-white rounded-xl shadow-lg">
              <div className="p-6">
                <Dialog.Title className="text-lg font-medium mb-4">
                  {selectedEvent ? 'Edit Event' : 'Create Event'}
                </Dialog.Title>
                <EventForm
                  event={selectedEvent}
                  selectedDate={selectedDate}
                  onClose={handleModalClose}
                  onSuccess={() => {
                    handleModalClose();
                    fetchEvents();
                  }}
                />
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

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

// Helper functions
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}