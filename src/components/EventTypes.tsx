import { useState } from 'react';
import { EventCategoryModal } from './EventCategoryModal';
import { Edit2 } from 'lucide-react';

export function EventTypes() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // ... existing code ...

  return (
    <div>
      {/* ... existing JSX ... */}
      
      <div className="mt-4 space-y-2">
        {eventTypes.map((type) => (
          <div 
            key={type.id}
            className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: type.color }}
              />
              <span>{type.name}</span>
            </div>
            <button
              onClick={() => {
                setSelectedCategory(type);
                setShowEditModal(true);
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <Edit2 className="h-4 w-4 text-gray-500" />
            </button>
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
        }}
      />
    </div>
  );
} 