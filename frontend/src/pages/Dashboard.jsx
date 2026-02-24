import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import styles from './Dashboard.module.css';
import Analytics from './Analytics';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const SOURCES  = ['website', 'referral', 'social_media', 'walk_in', 'phone', 'other'];

const STATUS_META = {
  new:       { label: 'New',       color: '#60a5fa' },
  contacted: { label: 'Contacted', color: '#facc15' },
  qualified: { label: 'Qualified', color: '#c084fc' },
  converted: { label: 'Converted', color: '#4ade80' },
  lost:      { label: 'Lost',      color: '#f87171' },
};

export default function Dashboard() {
  const { user, logout }          = useAuth();
  const navigate                  = useNavigate();
  const [tab, setTab]             = useState('leads');
  const [leads, setLeads]         = useState([]);
  const [allLeads, setAllLeads]   = useState([]);
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('');
  const [modal, setModal]         = useState(null);
  const [toast, setToast]         = useState(null);

  const isAdmin = user?.role === 'admin';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAllLeads = useCallback(async () => {
    try {
      const { data } = await api.get('/lead');
      setAllLeads(data.leads || []);
    } catch { /* silent */ }
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get('/lead', { params });
      setLeads(data.leads || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load leads', 'error');
    } finally { setLoading(false); }
  }, [search, filterStatus]);

  const fetchStaff = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data } = await api.get('/auth/staff');
      setStaff(data.staff || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load staff', 'error');
    } finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => {
    if (tab === 'leads') { fetchLeads(); fetchAllLeads(); }
    if (tab === 'staff') fetchStaff();
  }, [tab, fetchLeads, fetchStaff, fetchAllLeads]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleStatusChange = async (leadId, status) => {
    try {
      await api.patch(`/lead/${leadId}/status`, { status });
      setLeads(p => p.map(l => l.id === leadId ? { ...l, status } : l));
      setAllLeads(p => p.map(l => l.id === leadId ? { ...l, status } : l));
      showToast('Status updated');
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleDeleteLead = async (leadId) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await api.delete(`/lead/${leadId}`);
      setLeads(p => p.filter(l => l.id !== leadId));
      setAllLeads(p => p.filter(l => l.id !== leadId));
      showToast('Lead deleted');
    } catch { showToast('Failed to delete lead', 'error'); }
  };

  const handleDeactivate = async (staffId) => {
    if (!confirm('Deactivate this staff member? They will be logged out immediately.')) return;
    try {
      await api.patch(`/auth/staff/${staffId}/deactivate`);
      setStaff(p => p.map(s => s.id === staffId ? { ...s, is_active: false } : s));
      showToast('Staff member deactivated');
    } catch (err) { showToast(err.response?.data?.error || 'Failed to deactivate', 'error'); }
  };

  const handleReactivate = async (staffId) => {
    try {
      await api.patch(`/auth/staff/${staffId}/reactivate`);
      setStaff(p => p.map(s => s.id === staffId ? { ...s, is_active: true } : s));
      showToast('Staff member reactivated');
    } catch { showToast('Failed to reactivate', 'error'); }
  };

  // Always use allLeads for stat counts so they never reset when filtering
  const stats = STATUSES.map(s => ({
    status: s, count: allLeads.filter(l => l.status === s).length, ...STATUS_META[s]
  }));

  // Staff counts for sidebar badge
  const activeStaffCount = staff.filter(s => s.is_active && s.role === 'staff').length;

  return (
    <div className={styles.root}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={styles.logoMark}>FZ</span>
          <span className={styles.logoText}>FitZone</span>
        </div>

        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${tab === 'leads' ? styles.navActive : ''}`} onClick={() => setTab('leads')}>
            <Icon name="leads" /> Leads
          </button>

          {isAdmin && (
            <button className={`${styles.navItem} ${tab === 'staff' ? styles.navActive : ''}`} onClick={() => setTab('staff')}>
              <Icon name="members" /> Staff
              {activeStaffCount > 0 && <span className={styles.staffCount}>{activeStaffCount}</span>}
            </button>
          )}

          <button className={`${styles.navItem} ${tab === 'analytics' ? styles.navActive : ''}`} onClick={() => setTab('analytics')}>
            <Icon name="analytics" /> Analytics
          </button>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.username}</span>
              <span className={`${styles.userRole} ${styles[`role_${user?.role}`]}`}>{user?.role}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <Icon name="logout" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* ════════ LEADS TAB ════════ */}
        {tab === 'leads' && (
          <>
            <header className={styles.header}>
              <div>
                <h1 className={styles.pageTitle}>Leads</h1>
                <p className={styles.pageSub}>{allLeads.length} total leads</p>
              </div>
              <button className={styles.createBtn} onClick={() => setModal('lead')}>+ New Lead</button>
            </header>

            <div className={styles.statsRow}>
              {stats.map(({ status, label, count, color }) => (
                <button
                  key={status}
                  className={`${styles.statCard} ${filterStatus === status ? styles.statActive : ''}`}
                  onClick={() => setFilter(f => f === status ? '' : status)}
                  style={{ '--accent': color }}
                >
                  <span className={styles.statCount}>{count}</span>
                  <span className={styles.statLabel}>{label}</span>
                  <span className={styles.statBar} style={{ width: `${allLeads.length ? (count / allLeads.length) * 100 : 0}%` }} />
                </button>
              ))}
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchWrap}>
                <Icon name="search" />
                <input className={styles.searchInput} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button className={styles.clearBtn} onClick={() => setSearch('')}>×</button>}
              </div>
              {filterStatus && (
                <button className={styles.filterChip} onClick={() => setFilter('')}>
                  {STATUS_META[filterStatus]?.label} ×
                </button>
              )}
            </div>

            <div className={styles.tableWrap}>
              {loading ? (
                <div className={styles.empty}><div className={styles.loadingSpinner} /><span>Loading leads…</span></div>
              ) : leads.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>◎</span>
                  <span>No leads found</span>
                  <button className={styles.emptyBtn} onClick={() => setModal('lead')}>Add your first lead</button>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Added by</th>
                      <th>Date</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className={styles.row}>
                        <td className={styles.nameCell}>
                          <div className={styles.leadAvatar}>{lead.name[0]}</div>
                          {lead.name}
                        </td>
                        <td className={styles.mono}>{lead.email}</td>
                        <td className={styles.mono}>{lead.phone || '—'}</td>
                        <td><span className={styles.sourceBadge}>{(lead.source || '—').replace('_', ' ')}</span></td>
                        <td>
                          <select
                            className={styles.statusSelect}
                            value={lead.status}
                            style={{ '--c': STATUS_META[lead.status]?.color }}
                            onChange={e => handleStatusChange(lead.id, e.target.value)}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                          </select>
                        </td>
                        <td className={styles.createdBy}>{lead.created_by_username || '—'}</td>
                        <td className={styles.dateCell}>{new Date(lead.created_at).toLocaleDateString()}</td>
                        {isAdmin && (
                          <td><button className={styles.deleteBtn} onClick={() => handleDeleteLead(lead.id)}>Delete</button></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ════════ STAFF TAB ════════ */}
        {tab === 'staff' && isAdmin && (
          <>
            <header className={styles.header}>
              <div>
                <h1 className={styles.pageTitle}>Staff</h1>
                <p className={styles.pageSub}>{staff.filter(s => s.role === 'staff').length} staff members</p>
              </div>
              <button className={styles.createBtn} onClick={() => setModal('staff')}>+ Add Staff</button>
            </header>

            <div className={styles.tableWrap}>
              {loading ? (
                <div className={styles.empty}><div className={styles.loadingSpinner} /><span>Loading staff…</span></div>
              ) : staff.filter(s => s.role === 'staff').length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>◉</span>
                  <span>No staff members yet</span>
                  <button className={styles.emptyBtn} onClick={() => setModal('staff')}>Add first staff member</button>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Created by</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.filter(s => s.role === 'staff').map((member) => (
                      <tr key={member.id} className={styles.row}>
                        <td className={styles.nameCell}>
                          <div className={styles.leadAvatar}>{(member.full_name || member.username)[0]}</div>
                          {member.full_name || '—'}
                        </td>
                        <td className={styles.mono}>@{member.username}</td>
                        <td className={styles.mono}>{member.email}</td>
                        <td>
                          <span className={`${styles.statusDot} ${member.is_active ? styles.dotActive : styles.dotInactive}`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className={styles.createdBy}>
                          {member.created_by_username
                            ? <span className={styles.creatorBadge}>@{member.created_by_username}</span>
                            : '—'
                          }
                        </td>
                        <td className={styles.dateCell}>{new Date(member.created_at).toLocaleDateString()}</td>
                        <td>
                          {member.is_active
                            ? <button className={styles.deactivateBtn} onClick={() => handleDeactivate(member.id)}>Deactivate</button>
                            : <button className={styles.reactivateBtn} onClick={() => handleReactivate(member.id)}>Reactivate</button>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
        {tab === 'analytics' && <Analytics />}
      </main>

      {/* ── Modals ── */}
      {modal === 'lead'  && <LeadModal  onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchLeads(); fetchAllLeads(); showToast('Lead created!'); }} />}
      {modal === 'staff' && <StaffModal onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchStaff(); showToast('Staff account created!'); }} />}

      {/* ── Toast ── */}
      {toast && <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>{toast.msg}</div>}
    </div>
  );
}

// ── Create Lead Modal ─────────────────────────────────────────────────────────
function LeadModal({ onClose, onSuccess }) {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', source: 'website', notes: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/lead', form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create lead');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="New Lead" onClose={onClose}>
      <form onSubmit={submit} className={styles.modalForm}>
        <div className={styles.modalGrid}>
          <MField label="Name *"  type="text"  value={form.name}  onChange={set('name')}  placeholder="Full name"       required />
          <MField label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="email@gym.com"  required />
          <MField label="Phone"   type="tel"   value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          <div className={styles.mField}>
            <label className={styles.mLabel}>Source</label>
            <select className={styles.mInput} value={form.source} onChange={set('source')}>
              {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.mField}>
          <label className={styles.mLabel}>Notes</label>
          <textarea className={`${styles.mInput} ${styles.textarea}`} value={form.notes} onChange={set('notes')} placeholder="Optional notes…" rows={3} />
        </div>
        {error && <div className={styles.modalError}>{error}</div>}
        <ModalActions onClose={onClose} loading={loading} label="Create Lead" />
      </form>
    </Modal>
  );
}

// ── Create Staff Modal ────────────────────────────────────────────────────────
function StaffModal({ onClose, onSuccess }) {
  const [form, setForm]         = useState({ username: '', email: '', password: '', full_name: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/register', { ...form, role: 'staff' });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create staff account');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Add Staff Member" onClose={onClose}>
      <form onSubmit={submit} className={styles.modalForm}>
        <div className={styles.modalGrid}>
          <MField label="Full Name"  type="text"  value={form.full_name} onChange={set('full_name')} placeholder="Jane Doe" />
          <MField label="Username *" type="text"  value={form.username}  onChange={set('username')}  placeholder="janedoe" required />
          <MField label="Email *"    type="email" value={form.email}     onChange={set('email')}     placeholder="jane@fitzone.com" required />
        </div>
        <div className={styles.mField}>
          <label className={styles.mLabel}>Password *</label>
          <div className={styles.mPasswordWrap}>
            <input
              className={styles.mInput}
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 8 characters"
              required
            />
            <button type="button" className={styles.mEyeBtn} onClick={() => setShowPass(p => !p)} tabIndex={-1}>
              {showPass ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
        </div>
        <p className={styles.roleNote}>
          ◈ This will create a <strong>Staff</strong> account with lead management access only.
        </p>
        {error && <div className={styles.modalError}>{error}</div>}
        <ModalActions onClose={onClose} loading={loading} label="Create Staff Account" />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, loading, label }) {
  return (
    <div className={styles.modalActions}>
      <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
      <button type="submit" className={styles.modalSubmit} disabled={loading}>
        {loading ? <span className={styles.spinnerSm} /> : label}
      </button>
    </div>
  );
}

function MField({ label, ...props }) {
  return (
    <div className={styles.mField}>
      <label className={styles.mLabel}>{label}</label>
      <input className={styles.mInput} {...props} />
    </div>
  );
}

function Icon({ name }) {
  const icons = { leads: '◈', members: '◉', analytics: '◎', settings: '⊙', logout: '⇥', search: '⌕' };
  return <span className={styles.icon}>{icons[name] || '●'}</span>;
}

function EyeOn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}