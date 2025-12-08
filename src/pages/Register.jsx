// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css'; // подключаем глобальные стили

export default function Register() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleRegister(e) {
    e.preventDefault();
    setErr('');

    if (!agree) {
      setErr('Нужно подтвердить ознакомление с правилами.');
      return;
    }
    if (!username || !password) {
      setErr('Введите имя и пароль.');
      return;
    }
    if (password.length < 6) {
      setErr('Пароль должен быть не менее 6 символов.');
      return;
    }

    setLoading(true);

    const email = `${username}@example.com`;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setErr('Ошибка: не удалось получить ID пользователя.');
      setLoading(false);
      return;
    }

    const { error: pErr } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username,
        points: 0,
        vip: false,
      });

    if (pErr) {
      setErr(pErr.message);
      setLoading(false);
      return;
    }

    nav('/profile');
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Регистрация</h1>
      <form onSubmit={handleRegister} className="auth-form">
        <label>Имя (как в Telegram)</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Имя"
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
        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={agree}
            onChange={e => setAgree(e.target.checked)}
          />
          <span>Правилами ознакомился</span>
        </label>
        {err && <p className="auth-error">{err}</p>}
        <button disabled={loading} type="submit" className="auth-button">
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="auth-switch">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}
