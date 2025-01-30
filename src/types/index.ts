export interface Event {
  id: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  description?: string;
  location?: string;
}

export interface CalendarProps {
  events: Event[];
} 