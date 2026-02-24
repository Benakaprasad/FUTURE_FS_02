import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function LoginPage() {
  const [form, setForm]           = useState({ email: '', password: '' });
  const [showPassword, setShow]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const { login }                 = useAuth();
  const navigate                  = useNavigate();

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      {/* ── Left branding panel ── */}
      <div className={styles.left}>
        <div className={styles.noise} />
        <div className={styles.leftContent}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>FZ</span>
            <span className={styles.logoText}>FitZone</span>
          </div>

          <div className={styles.headline}>
            <h1 className={styles.h1}>MANAGE<br />YOUR<br />LEADS.</h1>
            <p className={styles.sub}>The CRM built for gym teams who move fast.</p>
          </div>

          <div className={styles.ticker}>
            <div className={styles.tickerTrack}>
              {['TRACK LEADS','CONVERT MORE','GROW FASTER','STAY SHARP','TRACK LEADS','CONVERT MORE','GROW FASTER','STAY SHARP'].map((t, i) => (
                <span key={i} className={styles.tickerItem}>{t} <span className={styles.dot}>●</span></span>
              ))}
            </div>
          </div>

          <div className={styles.stats}>
            {[['98%','Uptime'],['2.4s','Avg Response'],['500+','Gyms']].map(([val, label]) => (
              <div key={label} className={styles.stat}>
                <span className={styles.statVal}>{val}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className={styles.right}>
        <div className={styles.formWrap}>

          <div className={styles.formHeader}>
            <div className={styles.accessBadge}>Staff & Admin Access Only</div>
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSub}>Sign in to your FitZone CRM dashboard</p>
          </div>

          <form onSubmit={submit} className={styles.form}>
            {/* Email */}
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@fitzone.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password with show/hide */}
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder={showPassword ? 'Enter password' : '••••••••'}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShow(p => !p)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                <span className={styles.errorIcon}>!</span>
                {error}
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Sign In →'}
            </button>
          </form>

          <p className={styles.hint}>
            Don't have an account? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

function EyeOn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}