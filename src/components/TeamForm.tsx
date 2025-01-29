import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface TeamFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    id?: string;
    name: string;
    description: string;
  };
}

export default function TeamForm({ onSuccess, onCancel, initialData }: TeamFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      if (initialData?.id) {
        // Update existing team
        const { error } = await supabase
          .from('teams')
          .update({ name, description })
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        // Get user's organization directly
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .select('id')
          .single();

        if (orgError) throw orgError;

        // Create new team
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .insert([
            {
              name,
              description,
              organisation_id: orgData.id,
            },
          ])
          .select()
          .single();

        if (teamError) throw teamError;

        // Add current user as team manager
        const { error: memberError } = await supabase
          .from('team_members')
          .insert([
            {
              team_id: team.id,
              user_id: user.user.id,
              role: 'manager',
            },
          ]);

        if (memberError) throw memberError;
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving team:', error);
      setError(error instanceof Error ? error.message : 'Failed to save team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Team Name
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="name"
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {loading ? 'Saving...' : initialData?.id ? 'Update Team' : 'Create Team'}
        </button>
      </div>
    </form>
  );
}