/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Satisfy Supabase Realtime client requirements in Node < 22 environments without loading external ws library
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = class {};
}

dotenv.config({ path: '.env.local' });
dotenv.config();

// Fixes: "import.meta" is not available with the "cjs" output format warning/crash in production bundle
let currentFilename = '';
let currentDirname = '';
try {
  currentFilename = fileURLToPath(import.meta.url);
  currentDirname = path.dirname(currentFilename);
} catch (e) {
  currentFilename = __filename;
  currentDirname = __dirname;
}

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'manley2026';
const DB_PATH = path.join(process.cwd(), 'data/db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabase = !!(supabaseUrl && supabaseKey);
const supabase = useSupabase ? createClient(supabaseUrl, supabaseKey) : null;

if (useSupabase) {
  console.log('[Memorial Backend] Connected to Supabase:', supabaseUrl);
} else {
  console.log('[Memorial Backend] Running with local db.json database.');
}

// Read database helper (fallback mode)
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read DB, using fallback structure:', err);
    return { memorial: {}, testimonials: [], photos: [], tributeVideo: {}, audioTracks: [] };
  }
}

// Write database helper (fallback mode)
async function writeDB(data: any) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write to DB:', err);
  }
}

// Parse JSON bodies (increased limit to support base64 image uploads)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Serve uploads statically
app.use('/uploads', express.static(UPLOADS_DIR));

// --- API Routes ---

// Verify Admin Password
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'Mot de passe incorrect / Kod kòrèk' });
});

// Get Memorial Biography details
app.get('/api/memorial', async (req, res) => {
  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('memorial').select('*').eq('id', 'manley-memorial').maybeSingle();
    if (error) {
      console.error('Supabase error fetching memorial:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data || {});
  } else {
    const db = await readDB();
    res.json(db.memorial || {});
  }
});

// Update Memorial Details (Admin only)
app.post('/api/memorial', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('memorial').upsert({
      id: 'manley-memorial',
      ...req.body,
    }).select('*').single();
    
    if (error) {
      console.error('Supabase error updating memorial:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } else {
    const db = await readDB();
    db.memorial = {
      ...db.memorial,
      ...req.body,
    };
    await writeDB(db);
    res.json(db.memorial);
  }
});

// Get Testimonials (filter out pending/rejected unless admin)
app.get('/api/testimonials', async (req, res) => {
  const password = req.headers['x-admin-password'];
  const isAdmin = password === ADMIN_PASSWORD;

  let testimonials: any[] = [];
  if (useSupabase && supabase) {
    let query = supabase.from('testimonials').select('*');
    if (!isAdmin) {
      query = query.eq('status', 'approved');
    }
    const { data, error } = await query;
    if (error) {
      console.error('Supabase error fetching testimonials:', error);
      return res.status(500).json({ error: error.message });
    }
    testimonials = data || [];
  } else {
    const db = await readDB();
    if (isAdmin) {
      testimonials = db.testimonials || [];
    } else {
      testimonials = (db.testimonials || []).filter((t: any) => t.status === 'approved');
    }
  }

  // Fallback/Merge likes if they are not present in Supabase, or sync local
  const db = await readDB();
  const localLikes = db.likesMap || {};
  testimonials = testimonials.map((t: any) => {
    if (t.likes === undefined) {
      t.likes = localLikes[t.id] || 0;
    }
    return t;
  });

  return res.json(testimonials);
});

// Submit Testimonial (Starts as pending)
app.post('/api/testimonials', async (req, res) => {
  const { authorName, nickname, relationship, language, message, photoUrl, isAnonymous } = req.body;

  if (!authorName || !relationship || !language || !message) {
    return res.status(400).json({ error: 'Données incomplètes / Done pa konplè' });
  }

  const newId = 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const testimonialData = {
    id: newId,
    memorialId: 'manley-memorial',
    authorName,
    nickname: nickname || '',
    relationship,
    language,
    message,
    photoUrl: photoUrl || '',
    status: 'pending',
    isAnonymous: !!isAnonymous,
    likes: 0
  };

  if (useSupabase && supabase) {
    let insertData: any = {
      ...testimonialData,
      createdAt: new Date().toISOString()
    };
    
    let { data, error } = await supabase.from('testimonials').insert(insertData).select('*').single();
    
    // If error code is '42703' (column doesn't exist), retry without the likes field
    if (error && error.code === '42703') {
      console.warn("[Supabase Warning] 'likes' column is missing in 'testimonials' table. Retrying insert without 'likes' field.");
      const { likes, ...insertDataWithoutLikes } = insertData;
      const retry = await supabase.from('testimonials').insert(insertDataWithoutLikes).select('*').single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase error creating testimonial:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } else {
    const db = await readDB();
    db.testimonials = db.testimonials || [];
    const newTestimonial = {
      ...testimonialData,
      createdAt: new Date().toISOString()
    };
    db.testimonials.push(newTestimonial);
    await writeDB(db);
    res.status(201).json(newTestimonial);
  }
});

// Like/Unlike a Testimonial (Persistent state increment/decrement)
app.post('/api/testimonials/:id/like', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'like' or 'unlike'
  const increment = action === 'like' ? 1 : -1;

  let updatedTestimonial: any = null;

  // 1. Try to update in Supabase if active
  if (useSupabase && supabase) {
    try {
      const { data: current, error: getError } = await supabase
        .from('testimonials')
        .select('likes')
        .eq('id', id)
        .single();

      if (!getError && current && current.likes !== undefined && current.likes !== null) {
        const newLikes = Math.max(0, (current.likes || 0) + increment);
        const { data, error: updateError } = await supabase
          .from('testimonials')
          .update({ likes: newLikes })
          .eq('id', id)
          .select('*')
          .single();

        if (!updateError) {
          updatedTestimonial = data;
        } else {
          console.error('Supabase error updating likes:', updateError);
        }
      } else {
        console.warn("[Supabase Warning] 'likes' column is missing or failed to fetch. Falling back to local db.json storage.");
      }
    } catch (err) {
      console.error('Unexpected Supabase error in like endpoint:', err);
    }
  }

  // 2. Always sync / save to local db.json (acting as primary local storage or fallback/sync)
  const db = await readDB();
  db.likesMap = db.likesMap || {};
  db.likesMap[id] = Math.max(0, (db.likesMap[id] || 0) + increment);

  db.testimonials = db.testimonials || [];
  const index = db.testimonials.findIndex((t: any) => t.id === id);
  if (index !== -1) {
    db.testimonials[index].likes = Math.max(0, (db.testimonials[index].likes || 0) + increment);
    if (!updatedTestimonial && !useSupabase) {
      updatedTestimonial = db.testimonials[index];
    }
  }
  await writeDB(db);

  // 3. Fallback: if we haven't resolved the updated testimonial because of a missing supabase column,
  // fetch the latest testimonial details from Supabase and merge the local likes map value.
  if (!updatedTestimonial) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase.from('testimonials').select('*').eq('id', id).single();
      if (data) {
        updatedTestimonial = {
          ...data,
          likes: db.likesMap[id]
        };
      }
    } else if (index !== -1) {
      updatedTestimonial = db.testimonials[index];
    }
  }

  if (updatedTestimonial) {
    res.json(updatedTestimonial);
  } else {
    res.status(404).json({ error: 'Témoignage non trouvé / Temwayaj pa jwenn' });
  }
});

// Moderate Testimonial Status (Admin only)
app.post('/api/testimonials/:id/status', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
  }

  const { id } = req.params;
  const { status } = req.body; // 'approved' | 'rejected' | 'pending'

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide / Estati pa valid' });
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('testimonials').update({ status }).eq('id', id).select('*').single();
    if (error) {
      console.error('Supabase error updating testimonial status:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } else {
    const db = await readDB();
    db.testimonials = db.testimonials || [];
    const index = db.testimonials.findIndex((t: any) => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Témoignage non trouvé / Temwayaj pa jwenn' });
    }

    db.testimonials[index].status = status;
    await writeDB(db);
    res.json(db.testimonials[index]);
  }
});

// Get Photo Gallery
app.get('/api/photos', async (req, res) => {
  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('photos').select('*');
    if (error) {
      console.error('Supabase error fetching photos:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
  } else {
    const db = await readDB();
    res.json(db.photos || []);
  }
});

// Add Photo
app.post('/api/photos', async (req, res) => {
  const { category, imageUrl, caption, uploadedBy } = req.body;

  if (!category || !imageUrl || !uploadedBy) {
    return res.status(400).json({ error: 'Données incomplètes / Done pa konplè' });
  }

  const newId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const photoData = {
    id: newId,
    memorialId: 'manley-memorial',
    category,
    imageUrl,
    caption: caption || '',
    uploadedBy
  };

  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('photos').insert({
      ...photoData,
      createdAt: new Date().toISOString()
    }).select('*').single();

    if (error) {
      console.error('Supabase error adding photo:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } else {
    const db = await readDB();
    db.photos = db.photos || [];
    const newPhoto = {
      ...photoData,
      createdAt: new Date().toISOString()
    };
    db.photos.push(newPhoto);
    await writeDB(db);
    res.status(201).json(newPhoto);
  }
});

// Delete Photo (Admin only)
app.post('/api/photos/:id/delete', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
  }

  const { id } = req.params;

  if (useSupabase && supabase) {
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) {
      console.error('Supabase error deleting photo:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } else {
    const db = await readDB();
    db.photos = db.photos || [];
    const initialLength = db.photos.length;
    db.photos = db.photos.filter((p: any) => p.id !== id);

    if (db.photos.length === initialLength) {
      return res.status(404).json({ error: 'Photo non trouvée / Foto pa jwenn' });
    }

    await writeDB(db);
    res.json({ success: true });
  }
});

// Get Tribute Video Configuration
app.get('/api/tribute-video', async (req, res) => {
  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('tribute_video').select('*').eq('id', 'v1').maybeSingle();
    if (error) {
      console.error('Supabase error fetching tribute video:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data || {});
  } else {
    const db = await readDB();
    res.json(db.tributeVideo || {});
  }
});

// Save Tribute Video Configuration (Admin only)
app.post('/api/tribute-video', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('tribute_video').upsert({
      id: 'v1',
      memorialId: 'manley-memorial',
      ...req.body,
      createdAt: new Date().toISOString()
    }).select('*').single();

    if (error) {
      console.error('Supabase error updating tribute video config:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } else {
    const db = await readDB();
    db.tributeVideo = {
      ...db.tributeVideo,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    await writeDB(db);
    res.json(db.tributeVideo);
  }
});

// Get Audio Tracks
app.get('/api/audio-tracks', async (req, res) => {
  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('audio_tracks').select('*').order('createdAt', { ascending: true });
    if (error) {
      console.error('Supabase error fetching audio tracks:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
  } else {
    const db = await readDB();
    res.json(db.audioTracks || []);
  }
});

// Add Audio Track (Admin only)
app.post('/api/audio-tracks', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
  }

  const { title, artist, youtubeUrl, audioUrl } = req.body;
  if (!title || !artist || !youtubeUrl) {
    return res.status(400).json({ error: 'Données incomplètes / Done pa konplè' });
  }

  const newId = 'a_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const trackData = {
    id: newId,
    title,
    artist,
    youtubeUrl,
    audioUrl: audioUrl || null
  };

  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('audio_tracks').insert({
      ...trackData,
      createdAt: new Date().toISOString()
    }).select('*').single();

    if (error) {
      console.error('Supabase error adding audio track:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } else {
    const db = await readDB();
    db.audioTracks = db.audioTracks || [];
    const trackWithDate = {
      ...trackData,
      createdAt: new Date().toISOString()
    };
    db.audioTracks.push(trackWithDate);
    await writeDB(db);
    res.status(201).json(trackWithDate);
  }
});

// Delete Audio Track (Admin only)
app.post('/api/audio-tracks/:id/delete', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
  }

  const { id } = req.params;

  if (useSupabase && supabase) {
    const { error } = await supabase.from('audio_tracks').delete().eq('id', id);
    if (error) {
      console.error('Supabase error deleting audio track:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } else {
    const db = await readDB();
    db.audioTracks = db.audioTracks || [];
    const initialLength = db.audioTracks.length;
    db.audioTracks = db.audioTracks.filter((t: any) => t.id !== id);

    if (db.audioTracks.length === initialLength) {
      return res.status(404).json({ error: 'Piste non trouvée / Mizik pa jwenn' });
    }

    await writeDB(db);
    res.json({ success: true });
  }
});

// Get Download Requests (Admin only)
app.get('/api/download-requests', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('download_requests').select('*').order('createdAt', { ascending: false });
    if (error) {
      console.error('Supabase error fetching download requests:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
  } else {
    const db = await readDB();
    const requests = db.downloadRequests || [];
    requests.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(requests);
  }
});

// Create Download Request
app.post('/api/download-requests', async (req, res) => {
  const { name, type } = req.body;
  if (!name || !type || (type !== 'photos' && type !== 'pdf')) {
    return res.status(400).json({ error: 'Données invalides / Done pa valid' });
  }

  const newId = 'dr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const requestData = {
    id: newId,
    name,
    type,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('download_requests').insert(requestData).select('*').single();
    if (error) {
      console.error('Supabase error creating download request:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } else {
    const db = await readDB();
    db.downloadRequests = db.downloadRequests || [];
    db.downloadRequests.push(requestData);
    await writeDB(db);
    res.status(201).json(requestData);
  }
});

// Action on Download Request (Admin only)
app.post('/api/download-requests/:id/action', async (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
  }

  const { id } = req.params;
  const { action } = req.body; // 'approved' or 'rejected'

  if (action !== 'approved' && action !== 'rejected') {
    return res.status(400).json({ error: 'Action invalide / Aksyon pa valid' });
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('download_requests')
      .update({ status: action })
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('Supabase error updating request status:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } else {
    const db = await readDB();
    db.downloadRequests = db.downloadRequests || [];
    const reqIdx = db.downloadRequests.findIndex((r: any) => r.id === id);
    if (reqIdx === -1) {
      return res.status(404).json({ error: 'Demande non trouvée / Demann pa jwenn' });
    }
    db.downloadRequests[reqIdx].status = action;
    await writeDB(db);
    res.json(db.downloadRequests[reqIdx]);
  }
});

// Batch check statuses of Download Requests
app.get('/api/download-requests/status', async (req, res) => {
  const { ids } = req.query;
  if (!ids || typeof ids !== 'string') {
    return res.json({});
  }

  const idList = ids.split(',').filter(Boolean);
  if (idList.length === 0) {
    return res.json({});
  }

  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('download_requests').select('id, status').in('id', idList);
    if (error) {
      console.error('Supabase error checking statuses:', error);
      return res.status(500).json({ error: error.message });
    }
    const mapping: Record<string, string> = {};
    data?.forEach((item: any) => {
      mapping[item.id] = item.status;
    });
    res.json(mapping);
  } else {
    const db = await readDB();
    const requests = db.downloadRequests || [];
    const mapping: Record<string, string> = {};
    requests.forEach((r: any) => {
      if (idList.includes(r.id)) {
        mapping[r.id] = r.status;
      }
    });
    res.json(mapping);
  }
});

// Base64 File Upload Route
app.post('/api/upload', async (req, res) => {
  const { base64Data, fileName } = req.body;

  if (!base64Data || !fileName) {
    return res.status(400).json({ error: 'Données manquantes / Done manke' });
  }

  // Extract content type and clean base64 string
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ error: 'Format base64 invalide / Fòma pa valid' });
  }

  const extension = path.extname(fileName) || '.jpg';
  const safeFileName = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + extension;
  const buffer = Buffer.from(matches[2], 'base64');

  try {
    const filePath = path.join(UPLOADS_DIR, safeFileName);
    await fs.writeFile(filePath, buffer);
    res.json({ url: `/uploads/${safeFileName}` });
  } catch (err) {
    console.error('File write failed:', err);
    res.status(500).json({ error: 'Échec de l\'écriture du fichier / Fichye pa sove' });
  }
});

export default app;
