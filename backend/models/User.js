import pool from '../config/database.js';

// created_by = the admin's user ID who created this account
const createUser = async (username, email, hashedPassword, role = 'staff', fullName = null, phone = null, createdBy = null) => {
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password, role, full_name, phone, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, username, email, role, full_name, phone, created_at`,
    [username, email, hashedPassword, role, fullName, phone, createdBy]
  );
  return rows[0];
};

const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE email = $1 AND is_active = true`, [email]
  );
  return rows[0];
};

const findUserById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, username, email, role, full_name, phone, is_active, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0];
};

export { createUser, findUserByEmail, findUserById };