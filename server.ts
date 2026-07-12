/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'manley2026';
const DB_PATH = path.join(process.cwd(), 'data/db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

// Ensure necessary directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
  } catch (err) {
    console.error('Error creating directories:', err);
  }
}

// Read database helper
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read DB, using fallback structure:', err);
    return { memorial: {}, testimonials: [], photos: [], tributeVideo: {} };
  }
}

// Write database helper
async function writeDB(data: any) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write to DB:', err);
  }
}

async function startServer() {
  await ensureDirectories();

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
    const db = await readDB();
    res.json(db.memorial);
  });

  // Update Memorial Details (Admin only)
  app.post('/api/memorial', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
    }

    const db = await readDB();
    db.memorial = {
      ...db.memorial,
      ...req.body,
    };
    await writeDB(db);
    res.json(db.memorial);
  });

  // Get Testimonials (filter out pending/rejected unless admin)
  app.get('/api/testimonials', async (req, res) => {
    const db = await readDB();
    const password = req.headers['x-admin-password'];

    if (password === ADMIN_PASSWORD) {
      // Return everything for the admin dashboard
      return res.json(db.testimonials);
    }

    // Public gets only approved
    const approved = db.testimonials.filter((t: any) => t.status === 'approved');
    res.json(approved);
  });

  // Submit Testimonial (Starts as pending)
  app.post('/api/testimonials', async (req, res) => {
    const { authorName, nickname, relationship, language, message, photoUrl, isAnonymous } = req.body;

    if (!authorName || !relationship || !language || !message) {
      return res.status(400).json({ error: 'Données incomplètes / Done pa konplè' });
    }

    const db = await readDB();
    const newTestimonial = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      memorialId: db.memorial.id || 'manley-memorial',
      authorName,
      nickname: nickname || '',
      relationship,
      language,
      message,
      photoUrl: photoUrl || '',
      status: 'pending', // Requires admin approval
      isAnonymous: !!isAnonymous,
      createdAt: new Date().toISOString()
    };

    db.testimonials.push(newTestimonial);
    await writeDB(db);

    res.status(201).json(newTestimonial);
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

    const db = await readDB();
    const index = db.testimonials.findIndex((t: any) => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Témoignage non trouvé / Temwayaj pa jwenn' });
    }

    db.testimonials[index].status = status;
    await writeDB(db);

    res.json(db.testimonials[index]);
  });

  // Get Photo Gallery
  app.get('/api/photos', async (req, res) => {
    const db = await readDB();
    res.json(db.photos || []);
  });

  // Add Photo (Admin only upload, or user if allowed - here we allow public upload to foster collaboration, but we can configure moderation later if needed)
  app.post('/api/photos', async (req, res) => {
    const { category, imageUrl, caption, uploadedBy } = req.body;

    if (!category || !imageUrl || !uploadedBy) {
      return res.status(400).json({ error: 'Données incomplètes / Done pa konplè' });
    }

    const db = await readDB();
    const newPhoto = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      memorialId: db.memorial.id || 'manley-memorial',
      category,
      imageUrl,
      caption: caption || '',
      uploadedBy,
      createdAt: new Date().toISOString()
    };

    db.photos = db.photos || [];
    db.photos.push(newPhoto);
    await writeDB(db);

    res.status(201).json(newPhoto);
  });

  // Delete Photo (Admin only)
  app.post('/api/photos/:id/delete', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
    }

    const { id } = req.params;
    const db = await readDB();

    const initialLength = db.photos.length;
    db.photos = db.photos.filter((p: any) => p.id !== id);

    if (db.photos.length === initialLength) {
      return res.status(404).json({ error: 'Photo non trouvée / Foto pa jwenn' });
    }

    await writeDB(db);
    res.json({ success: true });
  });

  // Get Tribute Video Configuration
  app.get('/api/tribute-video', async (req, res) => {
    const db = await readDB();
    res.json(db.tributeVideo || {});
  });

  // Save Tribute Video Configuration (Admin only)
  app.post('/api/tribute-video', async (req, res) => {
    const password = req.headers['x-admin-password'];
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Non autorisé / Pa otorize' });
    }

    const db = await readDB();
    db.tributeVideo = {
      ...db.tributeVideo,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    await writeDB(db);
    res.json(db.tributeVideo);
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

  // --- Vite Dev Server Middleware or Production Static Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Memorial Backend] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
