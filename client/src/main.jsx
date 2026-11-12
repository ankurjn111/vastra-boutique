import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminLogin from './components/AdminLogin.jsx';
import App from './App.jsx';
import './styles.css';

const Page = window.location.pathname === '/admin' ? AdminLogin : App;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
);
