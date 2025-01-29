import React, { useState, useEffect } from 'react';
import { format, parseISO, isBefore } from 'date-fns';
import { X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Team {
  id: string;
  name: string;
}

interface EventType {
  id: string;
  name: string;
  color: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  event_type: {
    id: string;
    name: string;
    color: string;
  };
  team: {
    id: string;
    name: string;
  };
  location: string;
}

interface EventFormProps {
  selectedDate: Date;
  onClose: () => void;
  onSuccess: () => void;
  event?: Event;
}

export default function EventForm({ selectedDate, onClose, onSuccess, event }: EventFormProps) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [isAllDay, setIsAllDay] = useState(event?.is_all_day || false);
  const [startTime, setStartTime] = useState(
    event ? format(parseISO(event.start_time), "yyyy-MM-dd'T'HH:mm") : format(selectedDate, "yyyy-MM-dd'T'HH:mm")
  );
  const [endTime, setEndTime] = useState(
    event ? format(parseISO(event.end_time), "yyyy-MM-dd'T'HH:mm") : format(selectedDate, "yyyy-MM-dd'T'HH:mm")
  );
  const [eventTypeId, setEventTypeId] = useState(event?.event_type.id || '');
  const [location, setLocation] = useState(event?.location || '');
  const [teamId, setTeamId] = useState(event?.team.id || '');
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get user's organization ID first
        const { data: orgData } = await supabase
          .from('team_members')
          .select('teams(organisation_id)')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!orgData?.teams?.organisation_id) {
          throw new Error('Organization not found');
        }

        // Fetch teams
        const { data: userTeams, error: teamsError } = await supabase
          .from('team_members')
          .select(`
            teams (
              id,
              name
            )
          `)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (teamsError) throw teamsError;

        const teams = userTeams
          .map(ut => ut.teams)
          .filter((team): team is Team => team !== null);

        setTeams(teams);

        // Set initial team ID if not already set
        if (!teamId && teams.length > 0) {
          setTeamId(teams[0].id);
        }

        // Fetch event types
        const { data: eventTypesData, error: eventTypesError } = await supabase
          .from('event_types')
          .select('*')
          .eq('organisation_id', orgData.teams.organisation_id)
          .order('name');

        if (eventTypesError) throw eventTypesError;

        setEventTypes(eventTypesData);

        // Set initial event type ID if not already set
        if (!eventTypeId && eventTypesData.length > 0) {
          setEventTypeId(eventTypesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load form data');
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (isAllDay) {
      // Only adjust times when switching to all-day
      const startDate = startTime.split('T')[0];
      const endDate = endTime.split('T')[0];
      setStartTime(`${startDate}T00:00`);
      setEndTime(`${endDate}T23:59`);
    }
  }, [isAllDay]);

  // New effect to sync end date with start date
  useEffect(() => {
    const startDate = startTime.split('T')[0];
    const endTimeComponents = endTime.split('T');
    if (endTimeComponents.length === 2) {
      const endTimeOnly = endTimeComponents[1];
      setEndTime(`${startDate}T${endTimeOnly}`);
    }
  }, [startTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!teamId || !eventTypeId) {
      setError('Please select a team and event type');
      return;
    }

    // Validate dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isBefore(endDate, startDate)) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);

    try {
      const eventData = {
        team_id: teamId,
        title,
        description,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        event_type_id: eventTypeId,
        location,
        is_all_day: isAllDay,
      };

      if (event) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert([eventData]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event. Please try again.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {event ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="team" className="block text-sm font-medium text-gray-700">
              Team
            </label>
            <select
              id="team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="event-type" className="block text-sm font-medium text-gray-700">
              Event Type
            </label>
            <select
              id="event-type"
              value={eventTypeId}
              onChange={(e) => setEventTypeId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select an event type</option>
              {eventTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="all-day"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="all-day" className="ml-2 block text-sm text-gray-900">
              All day event
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">
                {isAllDay ? 'Start Date' : 'Start Time'}
              </label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                id="start-time"
                value={isAllDay ? startTime.split('T')[0] : startTime}
                onChange={(e) => {
                  const newValue = isAllDay ? `${e.target.value}T00:00` : e.target.value;
                  setStartTime(newValue);
                }}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="end-time" className="block text-sm font-medium text-gray-700">
                {isAllDay ? 'End Date' : 'End Time'}
              </label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                id="end-time"
                value={isAllDay ? endTime.split('T')[0] : endTime}
                onChange={(e) => {
                  const newValue = isAllDay ? `${e.target.value}T23:59` : e.target.value;
                  setEndTime(newValue);
                }}
                required
                min={isAllDay ? startTime.split('T')[0] : startTime}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-between space-x-3">
            {event && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </button>
            )}
            <div className="flex justify-end space-x-3 flex-grow">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? (event ? 'Saving...' : 'Creating...') : (event ? 'Save Changes' : 'Create Event')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Event</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {loading ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}