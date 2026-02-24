import express from 'express';
import {
    getAllLeads, getLeadById, createLead, updateLead,
    deleteLead, updateLeadStatus, searchLeads,
    filterLeadsByStatus, searchAndFilterLeads
} from '../models/Lead.js';
import authenticateToken from '../middleware/auth.js';
import authorizeRole from '../middleware/role.js';

const router = express.Router();

// ─── Role shortcuts ───────────────────────────────────────────────────────────
const isStaff    = authorizeRole('admin', 'staff');
const isAdminOnly = authorizeRole('admin');

// ─── UUID validation (DB uses UUID, not integer) ──────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id) => UUID_REGEX.test(id);

// Valid values must match your DB ENUMs exactly
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const VALID_SOURCES  = ['website', 'referral', 'social_media', 'walk_in', 'phone', 'other'];

// ─── GET /api/lead ────────────────────────────────────────────────────────────
router.get('/', authenticateToken, isStaff, async (req, res, next) => {
    try {
        const { status, search } = req.query;

        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` });
        }

        let leads;
        if (search && status)  leads = await searchAndFilterLeads(search, status);
        else if (search)       leads = await searchLeads(search);
        else if (status)       leads = await filterLeadsByStatus(status);
        else                   leads = await getAllLeads();

        res.json({ success: true, count: leads.length, leads });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/lead/:id ────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, isStaff, async (req, res, next) => {
    try {
        if (!isValidUUID(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Invalid lead ID format' });
        }

        const lead = await getLeadById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

        res.json({ success: true, lead });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/lead ───────────────────────────────────────────────────────────
router.post('/', authenticateToken, isStaff, async (req, res, next) => {
    try {
        const { name, email, phone, source, notes } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Name and email are required' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }
        if (source && !VALID_SOURCES.includes(source)) {
            return res.status(400).json({ success: false, error: `Invalid source. Must be: ${VALID_SOURCES.join(', ')}` });
        }

        const lead = await createLead(name, email, phone, source, notes, req.user.id);
        res.status(201).json({ success: true, message: 'Lead created successfully', lead });
    } catch (err) {
        next(err);
    }
});

// ─── PUT /api/lead/:id ────────────────────────────────────────────────────────
router.put('/:id', authenticateToken, isStaff, async (req, res, next) => {
    try {
        if (!isValidUUID(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Invalid lead ID format' });
        }

        const { name, email, phone, source, status, notes } = req.body;

        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` });
        }
        if (source && !VALID_SOURCES.includes(source)) {
            return res.status(400).json({ success: false, error: `Invalid source. Must be: ${VALID_SOURCES.join(', ')}` });
        }

        const lead = await updateLead(req.params.id, { name, email, phone, source, status, notes });
        if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

        res.json({ success: true, message: 'Lead updated successfully', lead });
    } catch (err) {
        next(err);
    }
});

// ─── PATCH /api/lead/:id/status ───────────────────────────────────────────────
router.patch('/:id/status', authenticateToken, isStaff, async (req, res, next) => {
    try {
        if (!isValidUUID(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Invalid lead ID format' });
        }

        const { status } = req.body;
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` });
        }

        const lead = await updateLeadStatus(req.params.id, status);
        if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

        res.json({ success: true, message: 'Lead status updated', lead });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/lead/:id ─────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, isAdminOnly, async (req, res, next) => {
    try {
        if (!isValidUUID(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Invalid lead ID format' });
        }

        const lead = await deleteLead(req.params.id);
        if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

        res.json({ success: true, message: 'Lead deleted successfully', lead });
    } catch (err) {
        next(err);
    }
});

export default router;