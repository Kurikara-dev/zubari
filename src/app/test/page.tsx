'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  // const [tables, setTables] = useState<unknown[]>([]);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Test basic connection
      const { error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (error) {
        setConnectionStatus(`Error: ${error.message}`);
      } else {
        setConnectionStatus('✅ Supabase connection successful!');
        // setTables([]); // テーブル情報は後で実装
      }
    } catch (err) {
      setConnectionStatus(`❌ Connection failed: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Supabase Connection Test
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <p className="text-lg">{connectionStatus}</p>
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

        <div className="mt-6">
          <button
            onClick={testConnection}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
}