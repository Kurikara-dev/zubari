'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [rlsStatus, setRlsStatus] = useState<string>('Testing RLS...');
  const [schemaStatus, setSchemaStatus] = useState<string>('Checking schema...');

  useEffect(() => {
    testConnection();
    testRLS();
    testSchema();
  }, []);

  const testConnection = async () => {
    try {
      // Test basic connection
      if (!supabase) {
        setConnectionStatus('❌ Database connection not available');
        return;
      }
      
      const { error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error) {
        setConnectionStatus(`❌ Error: ${error.message}`);
      } else {
        setConnectionStatus('✅ Supabase connection successful!');
      }
    } catch (err) {
      setConnectionStatus(`❌ Connection failed: ${err}`);
    }
  };

  const testRLS = async () => {
    try {
      // Test RLS policies
      if (!supabase) {
        setRlsStatus('❌ Database connection not available');
        return;
      }
      
      const { error: usersError } = await supabase
        .from('users')
        .select('*');
      
      const { error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (usersError || projectsError) {
        setRlsStatus('✅ RLS is working (access denied without auth)');
      } else {
        setRlsStatus('⚠️ RLS may need configuration (access allowed)');
      }
    } catch (err) {
      setRlsStatus(`❌ RLS test failed: ${err}`);
    }
  };

  const testSchema = async () => {
    try {
      // Test if both tables exist and have expected structure
      if (!supabase) {
        setSchemaStatus('❌ Database connection not available');
        return;
      }
      
      const { error: usersError } = await supabase
        .from('users')
        .select('id, email, name, avatar_url, created_at, updated_at')
        .limit(1);

      const { error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, owner_id, created_at, updated_at')
        .limit(1);

      if (!usersError && !projectsError) {
        setSchemaStatus('✅ Schema structure is correct');
      } else {
        setSchemaStatus(`⚠️ Schema issues: Users(${usersError?.message || 'OK'}), Projects(${projectsError?.message || 'OK'})`);
      }
    } catch (err) {
      setSchemaStatus(`❌ Schema test failed: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Supabase Database Test Dashboard
        </h1>
        
        <div className="grid gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
            <p className="text-lg">{connectionStatus}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Schema Validation</h2>
            <p className="text-lg">{schemaStatus}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Row Level Security (RLS)</h2>
            <p className="text-lg">{rlsStatus}</p>
            {rlsStatus.includes('⚠️') && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>RLS Configuration Needed:</strong> Please apply the schema from 
                  <code className="bg-yellow-100 px-1 rounded"> supabase/initial-schema.sql </code>
                  in your Supabase Dashboard SQL Editor.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <div className="space-y-2 text-sm">
              <div>
                <strong>SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
              </div>
              <div>
                <strong>SUPABASE_ANON_KEY:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              testConnection();
              testRLS();
              testSchema();
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Rerun All Tests
          </button>
          <a
            href="https://zohgaairklkctyyimiza.supabase.co/project/_/sql"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md inline-block"
          >
            Open Supabase SQL Editor
          </a>
        </div>
      </div>
    </div>
  );
}