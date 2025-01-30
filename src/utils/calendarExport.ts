import { Event } from '../types';
import { startOfYear, endOfYear } from 'date-fns';
import { supabase } from '../lib/supabase';

interface ExportOptions {
  selectedTeam: string;
  selectedEventType: string;
  newEventsOnly: boolean;
  force?: boolean;
}

async function getLastExportTime(): Promise<string | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data: exportRecord } = await supabase
    .from('calendar_exports')
    .select('last_export_time')
    .eq('user_id', user.user.id)
    .order('last_export_time', { ascending: false })
    .limit(1)
    .single();

  return exportRecord?.last_export_time || null;
}

async function updateLastExportTime(): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  const now = new Date().toISOString();
  
  const { data: existingRecord } = await supabase
    .from('calendar_exports')
    .select('id')
    .eq('user_id', user.user.id)
    .single();

  if (existingRecord) {
    await supabase
      .from('calendar_exports')
      .update({ last_export_time: now })
      .eq('id', existingRecord.id);
  } else {
    await supabase
      .from('calendar_exports')
      .insert([{ 
        last_export_time: now,
        user_id: user.user.id
      }]);
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
        query = query.or(`updated_at.gt.${lastExportTime},created_at.gt.${lastExportTime}`);
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

async function hasDownloadedBefore(): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;

  const { data: exportRecord } = await supabase
    .from('calendar_exports')
    .select('id')
    .eq('user_id', user.user.id)
    .limit(1)
    .single();

  return !!exportRecord;
}

export async function downloadCalendar(
  currentEvents: Event[], 
  options: ExportOptions
): Promise<{ requiresConfirmation: boolean }> {
  try {
    // If downloading all events and not forced, check if warning is needed
    if (!options.newEventsOnly && !options.force) {
      const hasDownloaded = await hasDownloadedBefore();
      if (hasDownloaded) {
        return { requiresConfirmation: true };
      }
    }

    const events = await fetchEvents(options);
    
    if (events.length === 0) {
      throw new Error('No new events to export');
    }

    const icsContent = generateICalendarFile(events);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    
    const filename = options.newEventsOnly 
      ? `calendar-events-new-${new Date().toISOString().split('T')[0]}.ics`
      : 'calendar-events.ics';
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Update last export time after successful download
    if (options.newEventsOnly || !hasDownloadedBefore()) {
      await updateLastExportTime();
    }

    return { requiresConfirmation: false };
  } catch (error) {
    console.error('Error downloading calendar:', error);
    throw error;
  }
} 