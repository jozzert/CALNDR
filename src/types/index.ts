export interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location?: string;
  event_type: {
    id: string;
    name: string;
    color: string;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface CalendarProps {
  events: Event[];
} 