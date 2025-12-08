// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css'; // подключаем глобальные стили

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);

    if (!username || !password) {
      setErr('Введите имя и пароль.');
      setLoading(false);
      return;
    }

    const email = `${username}@example.com`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    nav('/profile');
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Вход</h1>
      <form onSubmit={handleLogin} className="auth-form">
        <label>Имя пользователя</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Ваше имя"
          className="auth-input"
        />
        <label>Пароль</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Пароль"
          className="auth-input"
        />
        {err && <p className="auth-error">{err}</p>}
        <button disabled={loading} type="submit" className="auth-button">
          Войти
        </button>
      </form>
      <p className="auth-switch">
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
