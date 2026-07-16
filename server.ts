/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs/promises';
import express from 'express';
import app from './app';

const PORT = 3000;
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

ensureDirectories().then(() => {
  if (process.env.NODE_ENV !== 'production') {
    import('vite').then(({ createServer }) => {
      createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      }).then((vite) => {
        app.use(vite.middlewares);
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`[Memorial Backend] Local dev server listening at http://localhost:${PORT}`);
        });
      });
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Memorial Backend] Production server listening at http://localhost:${PORT}`);
    });
  }
});
