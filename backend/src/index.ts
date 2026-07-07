import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool } from './db';
import { createToken, requireAuth, type AuthenticatedRequest } from './auth';
import { generateSlug, isValidUrl } from './utils';

const app = express();
const port = Number(process.env.PORT || 4000);

// bcryptjs silently truncates input beyond 72 bytes, so cap password length to
// keep the whole secret meaningful and to bound request work.
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 72;

// Trust the deployment proxy so express-rate-limit keys on the real client IP.
app.set('trust proxy', 1);

// Send secure HTTP response headers (HSTS, no-sniff, frame protection, etc.).
app.use(helmet());

// Restrict cross-origin access to the configured frontend origin(s). A comma
// separated CORS_ORIGIN allowlist locks the API down; when unset we fall back to
// permissive access so local development keeps working.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Bound request bodies to prevent large-payload denial-of-service.
app.use(express.json({ limit: '16kb' }));

// Throttle authentication endpoints to slow down credential brute-forcing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});

app.get('/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    return response.json({ ok: true });
  } catch (error) {
    console.error('HEALTH_CHECK_ERROR', error);
    return response.status(503).json({ ok: false });
  }
});

app.post('/auth/signup', authLimiter, async (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string };

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.length > MAX_EMAIL_LENGTH ||
    password.length < 6 ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return response.status(400).json({ error: 'Email and a password between 6 and 72 characters are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount) {
      return response.status(409).json({ error: 'Email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [normalizedEmail, passwordHash]
    );

    const user = inserted.rows[0] as { id: number; email: string };
    const token = createToken(user.id, user.email);
    return response.status(201).json({ token, user });
  } catch (error) {
    console.error('SIGNUP_ERROR', error);
    return response.status(500).json({ error: 'Unable to create account.' });
  }
});

app.post('/auth/login', authLimiter, async (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string };

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return response.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (!result.rowCount) {
      return response.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0] as { id: number; email: string; password_hash: string };
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return response.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = createToken(user.id, user.email);
    return response.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('LOGIN_ERROR', error);
    return response.status(500).json({ error: 'Unable to login.' });
  }
});

app.post('/links', requireAuth, async (request: AuthenticatedRequest, response) => {
  const { targetUrl } = request.body as { targetUrl?: string };

  if (!targetUrl || !isValidUrl(targetUrl)) {
    return response.status(400).json({ error: 'A valid targetUrl is required.' });
  }

  try {
    let slug: string | null = null;

    for (let attempts = 0; attempts < 5; attempts += 1) {
      const candidate = generateSlug();
      const existing = await pool.query('SELECT id FROM links WHERE slug = $1', [candidate]);
      if (!existing.rowCount) {
        slug = candidate;
        break;
      }
    }

    if (!slug) {
      return response.status(503).json({ error: 'Unable to generate a unique short link right now.' });
    }

    const inserted = await pool.query(
      'INSERT INTO links (slug, target_url, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [slug, targetUrl, request.user!.userId]
    );

    return response.status(201).json(inserted.rows[0]);
  } catch (error) {
    console.error('CREATE_LINK_ERROR', error);
    return response.status(500).json({ error: 'Unable to create link.' });
  }
});

app.get('/links', requireAuth, async (request: AuthenticatedRequest, response) => {
  try {
    const result = await pool.query('SELECT * FROM links WHERE owner_id = $1 ORDER BY created_at DESC', [request.user!.userId]);
    return response.json(result.rows);
  } catch (error) {
    console.error('LIST_LINKS_ERROR', error);
    return response.status(500).json({ error: 'Unable to load links.' });
  }
});

app.get('/r/:slug', async (request, response) => {
  const { slug } = request.params;

  try {
    const result = await pool.query('UPDATE links SET clicks = clicks + 1 WHERE slug = $1 RETURNING target_url', [slug]);
    if (!result.rowCount) {
      return response.status(404).json({ error: 'Short link not found.' });
    }

    return response.redirect(result.rows[0].target_url as string);
  } catch (error) {
    console.error('REDIRECT_ERROR', error);
    return response.status(500).json({ error: 'Unable to redirect.' });
  }
});

app.delete('/links/:id', requireAuth, async (request: AuthenticatedRequest, response) => {
  const id = Number(request.params.id);

  if (Number.isNaN(id)) {
    return response.status(400).json({ error: 'Invalid link id.' });
  }

  try {
    const deleted = await pool.query('DELETE FROM links WHERE id = $1 AND owner_id = $2 RETURNING id', [id, request.user!.userId]);
    if (!deleted.rowCount) {
      return response.status(404).json({ error: 'Link not found.' });
    }

    return response.json({ success: true });
  } catch (error) {
    console.error('DELETE_LINK_ERROR', error);
    return response.status(500).json({ error: 'Unable to delete link.' });
  }
});

app.listen(port, () => {
  console.log(`Sniplet backend listening on port ${port}`);
});
