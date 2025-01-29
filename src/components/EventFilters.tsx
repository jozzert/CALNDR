import React from 'react';
import { Filter } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface EventType {
  id: string;
  name: string;
  color: string;
}

interface EventFiltersProps {
  teams: Team[];
  eventTypes: EventType[];
  selectedTeam: string;
  selectedEventType: string;
  onTeamChange: (teamId: string) => void;
  onEventTypeChange: (eventTypeId: string) => void;
}

export default function EventFilters({
  teams,
  eventTypes,
  selectedTeam,
  selectedEventType,
  onTeamChange,
  onEventTypeChange,
}: EventFiltersProps) {
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Filter className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-500">Filter by:</span>
      </div>
      
      <select
        value={selectedTeam}
        onChange={(e) => onTeamChange(e.target.value)}
        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        <option value="">All Teams</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>

      <select
        value={selectedEventType}
        onChange={(e) => onEventTypeChange(e.target.value)}
        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        <option value="">All Event Types</option>
        {eventTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </select>
    </div>
  );
}