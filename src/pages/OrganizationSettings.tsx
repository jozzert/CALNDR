import React, { useState, useEffect } from 'react';
import { Settings, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EventTypes } from '../components/EventTypes';
import { Toaster } from 'react-hot-toast';

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
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization's settings and preferences.
          </p>
        </div>

        {/* Organization Details Section */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Logo</label>
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
                    <div className="relative bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm flex items-center cursor-pointer hover:bg-gray-50">
                      <label htmlFor="logo-upload" className="relative text-sm font-medium text-indigo-600">
                        <span>Change</span>
                        <input
                          id="logo-upload"
                          name="logo-upload"
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleLogoUpload}
                          accept="image/*"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={organization.name}
                  onChange={(e) => setOrganization(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={organization.location || ''}
                  onChange={(e) => setOrganization(prev => prev ? { ...prev, location: e.target.value } : null)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Event Categories Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Event Categories</h2>
            <EventTypes />
          </div>
        </div>
      </div>
      
      <Toaster position="bottom-right" />
    </div>
  );
}