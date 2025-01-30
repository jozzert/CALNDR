import { useState } from 'react';
import { Event } from '../types';

export function useDragDrop(onEventMove: (event: Event, newDate: Date) => void) {
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);

  const handleDragStart = (event: Event) => {
    setDraggedEvent(event);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-indigo-50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-indigo-50');
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-indigo-50');
    
    if (draggedEvent) {
      onEventMove(draggedEvent, date);
      setDraggedEvent(null);
    }
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    draggedEvent
  };
} 