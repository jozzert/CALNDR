import { useState, useEffect } from 'react';
import { EventCategoryModal } from './EventCategoryModal';
import { Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface EventType {
  id: string;
  name: string;
  color: string;
}

export function EventTypes() {
  const [selectedCategory, setSelectedCategory] = useState<EventType | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEventTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setEventTypes(data || []);
    } catch (error) {
      console.error('Error fetching event types:', error);
      toast.error('Failed to load event types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const handleCategoryClick = (type: EventType) => {
    setSelectedCategory(type);
    setShowEditModal(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900">Event Categories</h2>
      
      <div className="mt-4 space-y-2">
        {eventTypes.map((type) => (
          <div 
            key={type.id}
            onClick={() => handleCategoryClick(type)}
            className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: type.color }}
              />
              <span>{type.name}</span>
            </div>
            <Edit2 className="h-4 w-4 text-gray-500" />
          </div>
        ))}
      </div>

      <EventCategoryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        onSuccess={() => {
          fetchEventTypes();
          setShowEditModal(false);
          setSelectedCategory(null);
        }}
      />
    </div>
  );
} 