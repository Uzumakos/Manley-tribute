import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  let supabaseStatus = 'NOT TESTED';
  let supabaseError = '';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.from('memorial').select('id').limit(1);
      if (error) {
        supabaseStatus = 'CONNECTED BUT QUERY FAILED';
        supabaseError = error.message;
      } else {
        supabaseStatus = `OK - found ${data?.length ?? 0} memorial row(s)`;
      }
    } catch (e: any) {
      supabaseStatus = 'CRASH';
      supabaseError = e?.message || String(e);
    }
  }

  res.status(200).json({
    status: 'function is alive',
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: supabaseUrl ? `SET → ${supabaseUrl.slice(0, 35)}...` : '❌ NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? '✅ SET' : '❌ NOT SET',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? '✅ SET' : '❌ NOT SET',
    },
    supabase: {
      status: supabaseStatus,
      error: supabaseError || null,
    },
    node: process.version,
    cwd: process.cwd(),
  });
}
