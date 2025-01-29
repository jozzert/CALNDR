import React, { useState, useEffect } from 'react';
import { Settings, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EventTypeManager from '../components/EventTypeManager';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  location: string | null;
}

export default function OrganizationSettings() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, []);

  async function fetchOrganization() {
    try {
      // First get the user's team memberships to find their organization
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('teams(organisation_id)')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .limit(1)
        .single();

      if (teamError) throw teamError;

      const organisationId = teamMembers.teams.organisation_id;

      // Then fetch the organization details
      const { data: org, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', organisationId)
        .single();

      if (orgError) throw orgError;
      setOrganization(org);
    } catch (error) {
      console.error('Error fetching organization:', error);
      setError('Failed to load organization details');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organization) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('organisations')
        .update({
          name: organization.name,
          location: organization.location,
          logo_url: organization.logo_url,
        })
        .eq('id', organization.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating organization:', error);
      setError('Failed to update organization details');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `organization-logos/${fileName}`;

    try {
      setError(null);
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setOrganization(prev => prev ? {
        ...prev,
        logo_url: publicUrl
      } : null);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError('Failed to upload logo');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">Organization not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Organization Settings
          </h2>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <div className="bg-white shadow sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-8 divide-y divide-gray-200">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="space-y-8 divide-y divide-gray-200">
              <div>
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Logo
                    </label>
                    <div className="mt-1 flex items-center">
                      {organization.logo_url ? (
                        <img
                          src={organization.logo_url}
                          alt="Organization logo"
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <Settings className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="relative bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm flex items-center cursor-pointer hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                          <label
                            htmlFor="logo-upload"
                            className="relative text-sm font-medium text-indigo-600 pointer-events-none"
                          >
                            <span>Change</span>
                            <span className="sr-only"> logo</span>
                          </label>
                          <input
                            id="logo-upload"
                            name="logo-upload"
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer border-gray-300 rounded-md"
                            onChange={handleLogoUpload}
                            accept="image/*"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Organization Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={organization.name}
                        onChange={(e) =>
                          setOrganization({ ...organization, name: e.target.value })
                        }
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Location
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="location"
                        id="location"
                        value={organization.location || ''}
                        onChange={(e) =>
                          setOrganization({ ...organization, location: e.target.value })
                        }
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-white shadow sm:rounded-lg p-6">
          <EventTypeManager />
        </div>
      </div>
    </div>
  );
}