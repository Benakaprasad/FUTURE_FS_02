import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { createUser, findUserByEmail, findUserById } from '../models/User.js';
import authenticateToken from '../middleware/auth.js';
import authorizeRole from '../middleware/role.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const generateAccessToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const setRefreshCookie = (res, token) =>
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login — public
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password are required' });

    const user = await findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, error: 'Invalid credentials' });

    if (!user.is_active)
      return res.status(403).json({ success: false, error: 'Account is inactive. Contact admin.' });

    const accessToken   = generateAccessToken(user);
    const rawRefresh    = generateRefreshToken();
    const hashedRefresh = hashToken(rawRefresh);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, hashedRefresh, req.ip, req.headers['user-agent']]
    );

    setRefreshCookie(res, rawRefresh);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, full_name: user.full_name }
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register — ADMIN ONLY
// Creates staff accounts. Admin role is blocked — only ONE admin can exist.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
  try {
    const { username, email, password, full_name, role = 'staff' } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!username || !email || !password)
      return res.status(400).json({ success: false, error: 'Username, email and password are required' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, error: 'Invalid email format' });

    if (password.length < 8)
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });

    // ── Block creating a second admin ─────────────────────────────────────────
    if (role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'An admin account already exists. Only one admin is allowed.'
      });
    }

    // ── Only staff role allowed through this endpoint ─────────────────────────
    if (role !== 'staff')
      return res.status(400).json({ success: false, error: 'Invalid role. Only staff accounts can be created.' });

    const existing = await findUserByEmail(email);
    if (existing)
      return res.status(409).json({ success: false, error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);

    // Pass req.user.id as created_by — links staff to the admin who created them
    const user = await createUser(username, email, hashedPassword, 'staff', full_name, null, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/staff — ADMIN ONLY (list all staff with creator info)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/staff', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         u.id, u.username, u.email, u.role, u.full_name,
         u.phone, u.is_active, u.created_at,
         creator.username AS created_by_username
       FROM users u
       LEFT JOIN users creator ON u.created_by = creator.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, staff: rows });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/staff/:id/deactivate — ADMIN ONLY
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/staff/:id/deactivate', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id)
      return res.status(400).json({ success: false, error: 'Cannot deactivate your own account' });

    // Block deactivating the admin account
    const { rows: target } = await pool.query(`SELECT role FROM users WHERE id = $1`, [id]);
    if (!target[0])
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    if (target[0].role === 'admin')
      return res.status(400).json({ success: false, error: 'Cannot deactivate the admin account' });

    const { rows } = await pool.query(
      `UPDATE users SET is_active = false WHERE id = $1 RETURNING id, username, is_active`, [id]
    );

    // Kick them out immediately by revoking all their tokens
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [id]);

    res.json({ success: true, message: 'Staff member deactivated', user: rows[0] });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/staff/:id/reactivate — ADMIN ONLY
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/staff/:id/reactivate', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET is_active = true WHERE id = $1 RETURNING id, username, is_active`, [req.params.id]
    );
    if (!rows[0])
      return res.status(404).json({ success: false, error: 'Staff member not found' });

    res.json({ success: true, message: 'Staff member reactivated', user: rows[0] });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh — silent token rotation
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken)
      return res.status(401).json({ success: false, error: 'Refresh token required' });

    const hashedToken = hashToken(rawToken);
    const { rows } = await pool.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()`, [hashedToken]
    );
    const stored = rows[0];

    if (!stored) {
      const { rows: revoked } = await pool.query(
        `SELECT user_id FROM refresh_tokens_revoked WHERE token_hash = $1`, [hashedToken]
      );
      if (revoked[0]) {
        await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [revoked[0].user_id]);
        res.clearCookie('refreshToken');
        return res.status(401).json({ success: false, error: 'Token reuse detected. All sessions revoked.' });
      }
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    const newRawToken    = generateRefreshToken();
    const newHashedToken = hashToken(newRawToken);

    await pool.query(
      `INSERT INTO refresh_tokens_revoked (token_hash, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [hashedToken, stored.user_id]
    );
    await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [hashedToken]);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [stored.user_id, newHashedToken, req.ip, req.headers['user-agent']]
    );

    const user = await findUserById(stored.user_id);
    setRefreshCookie(res, newRawToken);
    res.json({ success: true, accessToken: generateAccessToken(user) });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken)
      await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [hashToken(rawToken)]);
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

export default router;