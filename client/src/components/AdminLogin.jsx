import React, { useEffect, useRef, useState } from 'react';
import AdminDashboard from './AdminDashboard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'vastra-admin-token';

async function getAdminUser(token) {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Your sign-in has expired. Please sign in again.');

  const data = await response.json();
  if (data.user?.role !== 'admin') {
    throw new Error('This Google account does not have admin access.');
  }
  return data.user;
}

function AdminLogin() {
  const popupRef = useRef(null);
  const popupCheckRef = useRef(null);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const savedToken = sessionStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setBusy(true);
      getAdminUser(savedToken)
        .then((admin) => {
          if (active) setUser(admin);
        })
        .catch((authError) => {
          sessionStorage.removeItem(TOKEN_KEY);
          if (active) setError(authError.message);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'failed') {
      setError('Google sign-in did not complete. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    async function handleMessage(event) {
      if (
        event.origin !== new URL(API_URL).origin ||
        event.source !== popupRef.current ||
        event.data?.type !== 'vastra-admin-auth' ||
        typeof event.data.token !== 'string'
      ) {
        return;
      }

      popupRef.current?.close();
      popupRef.current = null;
      window.clearInterval(popupCheckRef.current);
      setBusy(true);
      setError('');

      try {
        const admin = await getAdminUser(event.data.token);
        sessionStorage.setItem(TOKEN_KEY, event.data.token);
        if (active) setUser(admin);
      } catch (authError) {
        sessionStorage.removeItem(TOKEN_KEY);
        if (active) setError(authError.message);
      } finally {
        if (active) setBusy(false);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => {
      active = false;
      window.removeEventListener('message', handleMessage);
      window.clearInterval(popupCheckRef.current);
    };
  }, []);

  function signIn() {
    setError('');
    const popup = window.open(
      `${API_URL}/auth/google/admin`,
      'vastra-admin-sign-in',
      'popup,width=520,height=680',
    );
    if (!popup) {
      setError('Your browser blocked the sign-in window. Allow pop-ups and try again.');
      return;
    }

    popupRef.current = popup;
    setBusy(true);
    popupCheckRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        window.clearInterval(popupCheckRef.current);
        popupRef.current = null;
        setBusy(false);
      }
    }, 500);
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setError('');
  }

  if (user) {
    return <AdminDashboard user={user} onSignOut={signOut} />;
  }

  return (
    <main className="admin-login">
      <a className="admin-login__brand" href="/">vastra <span>B O U T I Q U E</span></a>
      <section className="admin-login__card">
        <span className="eyebrow"><span className="eyebrow__line" /> BOUTIQUE ADMIN</span>
        <h1>Welcome back.</h1>
        <p className="admin-login__description">
          Sign in with the Google account registered as the boutique admin.
        </p>
        {error && <p className="admin-login__error" role="alert">{error}</p>}
        <button className="button button--dark admin-login__button" onClick={signIn} disabled={busy}>
          {busy ? 'Waiting for Google sign-in…' : 'Continue with Google'}
        </button>
        <a className="admin-login__back" href="/">Back to Vastra Boutique</a>
      </section>
    </main>
  );
}

export default AdminLogin;
