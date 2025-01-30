import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import EventForm from './EventForm';
import { format } from 'date-fns';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSuccess?: () => void;
}

export function EventModal({ isOpen, onClose, selectedDate, onSuccess }: EventModalProps) {
  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    Create Event
                    {selectedDate && (
                      <span className="text-sm text-gray-500 ml-2">
                        {format(selectedDate, 'MMMM d, yyyy')}
                      </span>
                    )}
                  </Dialog.Title>
                </div>
                <EventForm
                  selectedDate={selectedDate || new Date()}
                  onClose={onClose}
                  onSuccess={() => {
                    onSuccess?.();
                    onClose();
                  }}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}