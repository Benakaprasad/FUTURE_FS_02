import pool from '../config/database.js';

const getAllLeads = async () => {
  const { rows } = await pool.query(
    // Join users table to show which staff member created the lead
    `SELECT l.*, u.username AS created_by_username
     FROM leads l
     LEFT JOIN users u ON l.created_by = u.id
     ORDER BY l.created_at DESC`
  );
  return rows;
};

const getLeadById = async (id) => {
  const { rows } = await pool.query(
    `SELECT l.*, u.username AS created_by_username
     FROM leads l
     LEFT JOIN users u ON l.created_by = u.id
     WHERE l.id = $1`,
    [id]
  );
  return rows[0];
};

const createLead = async (name, email, phone, source, notes, createdBy) => {
  const { rows } = await pool.query(
    `INSERT INTO leads (name, email, phone, source, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, email, phone, source, notes, createdBy]
  );
  return rows[0];
};

const updateLead = async (id, fields) => {
  const { name, email, phone, source, status, notes } = fields;
  const { rows } = await pool.query(
    `UPDATE leads
     SET name   = COALESCE($1, name),
         email  = COALESCE($2, email),
         phone  = COALESCE($3, phone),
         source = COALESCE($4, source),
         status = COALESCE($5, status),
         notes  = COALESCE($6, notes)
     WHERE id = $7
     RETURNING *`,
    [name, email, phone, source, status, notes, id]
  );
  return rows[0];
};

const deleteLead = async (id) => {
  const { rows } = await pool.query(`DELETE FROM leads WHERE id = $1 RETURNING *`, [id]);
  return rows[0];
};

const updateLeadStatus = async (id, status) => {
  const { rows } = await pool.query(
    `UPDATE leads SET status = $1 WHERE id = $2 RETURNING *`, [status, id]
  );
  return rows[0];
};

const searchLeads = async (searchTerm) => {
  const { rows } = await pool.query(
    `SELECT l.*, u.username AS created_by_username
     FROM leads l
     LEFT JOIN users u ON l.created_by = u.id
     WHERE l.name ILIKE $1 OR l.email ILIKE $1
     ORDER BY l.created_at DESC`,
    [`%${searchTerm}%`]
  );
  return rows;
};

const filterLeadsByStatus = async (status) => {
  const { rows } = await pool.query(
    `SELECT l.*, u.username AS created_by_username
     FROM leads l
     LEFT JOIN users u ON l.created_by = u.id
     WHERE l.status = $1
     ORDER BY l.created_at DESC`,
    [status]
  );
  return rows;
};

const searchAndFilterLeads = async (searchTerm, status) => {
  const { rows } = await pool.query(
    `SELECT l.*, u.username AS created_by_username
     FROM leads l
     LEFT JOIN users u ON l.created_by = u.id
     WHERE (l.name ILIKE $1 OR l.email ILIKE $1) AND l.status = $2
     ORDER BY l.created_at DESC`,
    [`%${searchTerm}%`, status]
  );
  return rows;
};

export {
  getAllLeads, getLeadById, createLead, updateLead,
  deleteLead, updateLeadStatus, searchLeads,
  filterLeadsByStatus, searchAndFilterLeads
};