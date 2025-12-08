// src/components/Header.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css'; // подключаем глобальные стили

export default function Header({ session }) {
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    nav('/login');
  }

  useEffect(() => {
    async function checkAdmin() {
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      setIsAdmin(data?.is_admin || false);
    }
    checkAdmin();
  }, [session]);

  return (
    <header className="header">
      <h2 className="header-title">Эпоха</h2>
      {session && (
        <nav className="header-nav">
          <Link to="/profile" className="header-link">Профиль</Link>
          {isAdmin && <Link to="/admin" className="header-link">Админ</Link>}
          <button className="header-button" onClick={handleLogout}>Выход</button>
        </nav>
      )}
    </header>
  );
}

