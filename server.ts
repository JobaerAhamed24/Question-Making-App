import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { QuestionBankDatabase } from './server/db.ts';
import { RealtimeHub } from './server/realtime.ts';
import { createApiRouter } from './server/routes/api.ts';
import { SupabaseRealtimeBridge } from './server/supabaseBridge.ts';

export async function createAppServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const db = new QuestionBankDatabase();
  const supabaseBridge = new SupabaseRealtimeBridge();
  supabaseBridge.connectRealtime();
  const realtimeHub = new RealtimeHub(db, supabaseBridge);
  realtimeHub.attachToServer(httpServer);

  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));

  app.use('/api', createApiRouter(db, { realtimeHub, supabaseBridge }));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  return { app, httpServer, db, realtimeHub, supabaseBridge };
}

const isEntrypoint =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]).endsWith('server.ts');

if (isEntrypoint) {
  const PORT = Number(process.env.PORT || 3000);
  createAppServer()
    .then(({ httpServer }) => {
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`QuestionBank HTTP & Realtime WebSocket server running on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start QuestionBank server:', err);
      process.exit(1);
    });
}
