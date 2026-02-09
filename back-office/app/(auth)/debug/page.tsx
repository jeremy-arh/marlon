'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // First check client-side session
        const { data: { user: clientUser }, error: clientError } = await supabase.auth.getUser();
        
        // Then check server-side via API
        const response = await fetch('/api/admin/debug-status', {
          credentials: 'include', // Important: include cookies
        });
        const data = await response.json();
        
        setDebugInfo({
          clientSide: {
            user: clientUser ? { id: clientUser.id, email: clientUser.email } : null,
            error: clientError?.message,
          },
          serverSide: data,
        });
      } catch (error: any) {
        setDebugInfo({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (loading) {
    return <div className="p-8 bg-white text-black">Chargement...</div>;
  }

  return (
    <div className="container mx-auto bg-white p-8">
      <h1 className="mb-4 text-2xl font-bold text-black">Debug - État Super Admin</h1>
      <pre className="modal group overflow-auto rounded-lg bg-[#F3F4F6] p-4 text-sm text-black">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
