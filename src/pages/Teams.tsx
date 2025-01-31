import React, { useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TeamForm from '../components/TeamForm';
import TeamMemberList from '../components/TeamMemberList';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';

interface Team {
  id: string;
  name: string;
  description: string;
  member_count?: number;
}

interface TeamFormData {
  name: string;
  description?: string;
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: '',
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    // Check if we were navigated here with showNewTeamForm state
    if (location.state?.showNewTeamForm) {
      setShowNewTeamForm(true);
      // Clear the state so refreshing doesn't reopen the form
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  async function fetchTeams() {
    try {
      // Get user's organization first
      const { data: orgData } = await supabase
        .from('team_members')
        .select('teams(organisation_id)')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!orgData?.teams?.organisation_id) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      // Fetch all teams in the organization
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          team_members (count)
        `)
        .eq('organisation_id', orgData.teams.organisation_id);

      if (error) throw error;

      const teamsWithCount = teamsData.map(team => ({
        ...team,
        member_count: team.team_members?.[0]?.count || 0
      }));

      setTeams(teamsWithCount);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }

  const handleTeamSuccess = () => {
    setShowNewTeamForm(false);
    setSelectedTeam(null);
    fetchTeams();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: team, error } = await supabase
        .from('teams')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            organisation_id: (await supabase.auth.getUser()).data.user?.id, // You might need to adjust this based on your data structure
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add the current user as a team member
      if (team) {
        const { error: memberError } = await supabase
          .from('team_members')
          .insert([
            {
              team_id: team.id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              role: 'admin',
            },
          ]);

        if (memberError) throw memberError;
      }

      toast.success('Team created successfully!');
      navigate('/teams');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your teams and their members
          </p>
        </div>
        <button
          onClick={() => setShowNewTeamForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Team
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {showNewTeamForm && (
        <div className="max-w-2xl mx-auto py-8">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Create New Team</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a new team to collaborate on events and calendars.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <form onSubmit={handleSubmit}>
                <div className="shadow sm:rounded-md sm:overflow-hidden">
                  <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Team Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {loading ? 'Creating...' : 'Create Team'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedTeam && (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Edit Team: {selectedTeam.name}
            </h2>
            <TeamForm
              initialData={selectedTeam}
              onSuccess={handleTeamSuccess}
              onCancel={() => setSelectedTeam(null)}
            />
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200">
            <TeamMemberList teamId={selectedTeam.id} />
          </div>
        </div>
      )}

      {!showNewTeamForm && !selectedTeam && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No teams</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new team.</p>
            </div>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 cursor-pointer"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">{team.name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {team.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    {team.member_count === 0 ? (
                      <span className="text-yellow-600">No members</span>
                    ) : (
                      `${team.member_count} member${team.member_count === 1 ? '' : 's'}`
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}