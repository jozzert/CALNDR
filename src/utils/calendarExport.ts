import { Event } from '../types';
import { startOfYear, endOfYear } from 'date-fns';
import { supabase } from '../lib/supabase';

async function fetchYearEvents(selectedTeam: string, selectedEventType: string): Promise<Event[]> {
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());

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
      .gte('start_time', yearStart.toISOString())
      .lte('start_time', yearEnd.toISOString())
      .order('start_time', { ascending: true });

    if (selectedTeam) {
      query = query.eq('team_id', selectedTeam);
    }

    if (selectedEventType) {
      query = query.eq('event_type_id', selectedEventType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching year events:', error);
    throw error;
  }
}

export function generateICalendarFile(events: Event[]): string {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Your App//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach(event => {
    // Convert event dates to UTC format for iCalendar
    const startDate = new Date(event.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(event.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@yourdomain.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location || ''}`,
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');
  return icsContent.join('\r\n');
}

export async function downloadCalendar(currentEvents: Event[], selectedTeam: string, selectedEventType: string): Promise<void> {
  try {
    const yearEvents = await fetchYearEvents(selectedTeam, selectedEventType);
    const icsContent = generateICalendarFile(yearEvents);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'calendar-events.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading calendar:', error);
    throw error;
  }
} 