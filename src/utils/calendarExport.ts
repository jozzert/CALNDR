import { Event } from '../types';
import { startOfYear, endOfYear } from 'date-fns';
import { supabase } from '../lib/supabase';

interface ExportOptions {
  selectedTeam: string;
  selectedEventType: string;
  newEventsOnly: boolean;
}

async function getLastExportTime(): Promise<string | null> {
  const { data: exportRecord } = await supabase
    .from('calendar_exports')
    .select('last_export_time')
    .order('last_export_time', { ascending: false })
    .limit(1)
    .single();

  return exportRecord?.last_export_time || null;
}

async function updateLastExportTime(): Promise<void> {
  const now = new Date().toISOString();
  
  const { data: existingRecord } = await supabase
    .from('calendar_exports')
    .select('id')
    .limit(1)
    .single();

  if (existingRecord) {
    await supabase
      .from('calendar_exports')
      .update({ last_export_time: now })
      .eq('id', existingRecord.id);
  } else {
    await supabase
      .from('calendar_exports')
      .insert([{ last_export_time: now }]);
  }
}

async function fetchEvents({ selectedTeam, selectedEventType, newEventsOnly }: ExportOptions): Promise<Event[]> {
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

    if (newEventsOnly) {
      const lastExportTime = await getLastExportTime();
      if (lastExportTime) {
        query = query.gt('created_at', lastExportTime);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching events:', error);
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

export async function downloadCalendar(
  currentEvents: Event[], 
  options: ExportOptions
): Promise<void> {
  try {
    const events = await fetchEvents(options);
    
    if (events.length === 0) {
      throw new Error('No new events to export');
    }

    const icsContent = generateICalendarFile(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    
    // Add timestamp to filename if only exporting new events
    const filename = options.newEventsOnly 
      ? `calendar-events-new-${new Date().toISOString().split('T')[0]}.ics`
      : 'calendar-events.ics';
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Update last export time after successful download
    if (options.newEventsOnly) {
      await updateLastExportTime();
    }
  } catch (error) {
    console.error('Error downloading calendar:', error);
    throw error;
  }
} 