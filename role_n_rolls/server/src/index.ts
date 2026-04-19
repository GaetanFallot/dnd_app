import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/health', healthRouter);

// Future: campaign routes, lore routes, character routes.
// Most reads/writes will go directly through Supabase RLS from the client.
// This server is for operations that need service-role secrets (e.g. invite tokens,
// admin jobs, or aggregations that bypass RLS).

app.listen(PORT, () => {
  console.log(`[server] Role'n'Rolls API listening on http://localhost:${PORT}`);
});
