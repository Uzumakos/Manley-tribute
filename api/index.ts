/**
 * Unified Vercel Serverless API Handler
 * Handles all /api/* routes directly using Supabase — no Express dependency.
 * This is more reliable in Vercel's serverless environment than routing through Express.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// --- Shared Init ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabase = !!(supabaseUrl && supabaseKey);
const supabase = useSupabase ? createClient(supabaseUrl, supabaseKey) : null;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'manley2026';

function isAdmin(req: VercelRequest): boolean {
  return req.headers['x-admin-password'] === ADMIN_PASSWORD;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// --- Main Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  const urlPath = (req.url || '').split('?')[0];
  const method = req.method || 'GET';

  console.log(`[API] ${method} ${urlPath}`);

  try {
    // POST /api/admin/verify
    if (urlPath === '/api/admin/verify' && method === 'POST') {
      const { password } = req.body || {};
      if (password === ADMIN_PASSWORD) return res.json({ success: true });
      return res.status(401).json({ success: false, error: 'Mot de passe incorrect / Kod pa kòrèk' });
    }

    // GET /api/memorial
    if (urlPath === '/api/memorial' && method === 'GET') {
      if (!supabase) return res.json({});
      const { data, error } = await supabase.from('memorial').select('*').eq('id', 'manley-memorial').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || {});
    }

    // POST /api/memorial
    if (urlPath === '/api/memorial' && method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { data, error } = await supabase.from('memorial').upsert({ id: 'manley-memorial', ...req.body }).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // GET /api/testimonials
    if (urlPath === '/api/testimonials' && method === 'GET') {
      if (!supabase) return res.json([]);
      let query = supabase.from('testimonials').select('*');
      if (!isAdmin(req)) query = query.eq('status', 'approved');
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }

    // POST /api/testimonials
    if (urlPath === '/api/testimonials' && method === 'POST') {
      const { authorName, nickname, relationship, language, message, photoUrl, isAnonymous } = req.body || {};
      if (!authorName || !relationship || !language || !message) {
        return res.status(400).json({ error: 'Données incomplètes / Done pa konplè' });
      }
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const insertData = {
        id: newId('t'),
        memorialId: 'manley-memorial',
        authorName,
        nickname: nickname || '',
        relationship,
        language,
        message,
        photoUrl: photoUrl || '',
        status: 'pending',
        isAnonymous: !!isAnonymous,
        likes: 0,
        createdAt: new Date().toISOString(),
      };
      let { data, error } = await supabase.from('testimonials').insert(insertData).select('*').single();
      if (error && error.code === '42703') {
        const { likes, ...withoutLikes } = insertData;
        const retry = await supabase.from('testimonials').insert(withoutLikes).select('*').single();
        data = retry.data; error = retry.error;
      }
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    // POST /api/testimonials/:id/like
    const likeMatch = urlPath.match(/^\/api\/testimonials\/([^/]+)\/like$/);
    if (likeMatch && method === 'POST') {
      const id = likeMatch[1];
      const { action } = req.body || {};
      const increment = action === 'like' ? 1 : -1;
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { data: current } = await supabase.from('testimonials').select('likes').eq('id', id).single();
      if (current && current.likes !== undefined && current.likes !== null) {
        const newLikes = Math.max(0, (current.likes || 0) + increment);
        const { data, error } = await supabase.from('testimonials').update({ likes: newLikes }).eq('id', id).select('*').single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
      }
      return res.status(404).json({ error: 'Témoignage non trouvé' });
    }

    // POST /api/testimonials/:id/status
    const statusMatch = urlPath.match(/^\/api\/testimonials\/([^/]+)\/status$/);
    if (statusMatch && method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
      const id = statusMatch[1];
      const { status } = req.body || {};
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Statut invalide / Estati pa valid' });
      }
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { data, error } = await supabase.from('testimonials').update({ status }).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // GET /api/photos
    if (urlPath === '/api/photos' && method === 'GET') {
      if (!supabase) return res.json([]);
      const { data, error } = await supabase.from('photos').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }

    // POST /api/photos
    if (urlPath === '/api/photos' && method === 'POST') {
      const { category, imageUrl, caption, uploadedBy } = req.body || {};
      if (!category || !imageUrl || !uploadedBy) {
        return res.status(400).json({ error: 'Données incomplètes / Done pa konplè' });
      }
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { data, error } = await supabase.from('photos').insert({
        id: newId('p'), memorialId: 'manley-memorial', category,
        imageUrl, caption: caption || '', uploadedBy,
        createdAt: new Date().toISOString(),
      }).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    // POST /api/photos/:id/delete
    const photoDeleteMatch = urlPath.match(/^\/api\/photos\/([^/]+)\/delete$/);
    if (photoDeleteMatch && method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
      const id = photoDeleteMatch[1];
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { error } = await supabase.from('photos').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }

    // GET /api/tribute-video
    if (urlPath === '/api/tribute-video' && method === 'GET') {
      if (!supabase) return res.json({});
      const { data, error } = await supabase.from('tribute_video').select('*').eq('id', 'v1').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || {});
    }

    // POST /api/tribute-video
    if (urlPath === '/api/tribute-video' && method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { data, error } = await supabase.from('tribute_video').upsert({
        id: 'v1', memorialId: 'manley-memorial', ...req.body,
        createdAt: new Date().toISOString(),
      }).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // GET /api/audio-tracks
    if (urlPath === '/api/audio-tracks' && method === 'GET') {
      if (!supabase) return res.json([]);
      const { data, error } = await supabase.from('audio_tracks').select('*').order('createdAt', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }

    // POST /api/audio-tracks
    if (urlPath === '/api/audio-tracks' && method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
      const { title, artist, youtubeUrl, audioUrl } = req.body || {};
      if (!title || !artist || !youtubeUrl) {
        return res.status(400).json({ error: 'Données incomplètes / Done pa konplè' });
      }
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { data, error } = await supabase.from('audio_tracks').insert({
        id: newId('a'), title, artist, youtubeUrl, audioUrl: audioUrl || null,
        createdAt: new Date().toISOString(),
      }).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    // POST /api/audio-tracks/:id/delete
    const audioDeleteMatch = urlPath.match(/^\/api\/audio-tracks\/([^/]+)\/delete$/);
    if (audioDeleteMatch && method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
      const id = audioDeleteMatch[1];
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { error } = await supabase.from('audio_tracks').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }

    // GET /api/download-requests/status (must be before /:id/action route)
    if (urlPath === '/api/download-requests/status' && method === 'GET') {
      const ids = (req.query?.ids as string || '').split(',').filter(Boolean);
      if (!supabase || ids.length === 0) return res.json({});
      const { data, error } = await supabase.from('download_requests').select('id, status').in('id', ids);
      if (error) return res.status(500).json({ error: error.message });
      const mapping: Record<string, string> = {};
      data?.forEach((item: any) => { mapping[item.id] = item.status; });
      return res.json(mapping);
    }

    // GET /api/download-requests
    if (urlPath === '/api/download-requests' && method === 'GET') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
      if (!supabase) return res.json([]);
      const { data, error } = await supabase.from('download_requests').select('*').order('createdAt', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }

    // POST /api/download-requests
    if (urlPath === '/api/download-requests' && method === 'POST') {
      const { name, type } = req.body || {};
      if (!name || !type || (type !== 'photos' && type !== 'pdf')) {
        return res.status(400).json({ error: 'Données invalides / Done pa valid' });
      }
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const requestData = {
        id: newId('dr'), name, type, status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('download_requests').insert(requestData).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    // POST /api/download-requests/:id/action
    const drActionMatch = urlPath.match(/^\/api\/download-requests\/([^/]+)\/action$/);
    if (drActionMatch && method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
      const id = drActionMatch[1];
      const { action } = req.body || {};
      if (action !== 'approved' && action !== 'rejected') {
        return res.status(400).json({ error: 'Action invalide / Aksyon pa valid' });
      }
      if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
      const { data, error } = await supabase.from('download_requests').update({ status: action }).eq('id', id).select('*').single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // POST /api/upload (base64 file upload to Supabase Storage)
    if (urlPath === '/api/upload' && method === 'POST') {
      const { base64Data, fileName } = req.body || {};
      if (!base64Data || !fileName) {
        return res.status(400).json({ error: 'Données manquantes / Done manke' });
      }

      if (!supabase) {
        return res.status(503).json({ error: 'Supabase n\'est pas configuré / Supabase pa konfigire' });
      }

      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Format base64 invalide / Fòma pa valid' });
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const extension = path.extname(fileName) || '.jpg';
      const safeFileName = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + extension;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('testimonials')
        .upload(safeFileName, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: uploadError.message });
      }

      const { data: publicUrlData } = supabase.storage.from('testimonials').getPublicUrl(safeFileName);
      return res.json({ url: publicUrlData.publicUrl });
    }

    // 404 fallback
    return res.status(404).json({ error: `Route not found: ${method} ${urlPath}` });

  } catch (err: any) {
    console.error('[API Error]', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
