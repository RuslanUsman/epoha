// src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Avatar from '../components/Avatar';
import '../styles/global.css'; // подключаем глобальные стили

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState('');
  const [serverInfo, setServerInfo] = useState(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErr('Нет пользователя'); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error) setProfile(data);

      const channel = supabase
        .channel('profile-realtime')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          payload => {
            setProfile(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    loadProfile();

    const loadServerSettings = async () => {
      const { data } = await supabase
        .from('server_settings')
        .select('start_time, duration_seconds, server_name, prize')
        .eq('id', 1)
        .single();

      if (data) {
        const endTime = new Date(data.start_time).getTime() + data.duration_seconds * 1000;
        setServerInfo({
          start: new Date(data.start_time),
          end: new Date(endTime),
          name: data.server_name,
          prize: data.prize
        });
      }
    };
    loadServerSettings();
  }, []);

  useEffect(() => {
    if (!serverInfo) return;
    const interval = setInterval(() => {
      const diff = serverInfo.end - Date.now();
      if (diff <= 0) {
        setCountdown('Вайп завершён');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 1000 / 3600);
        const minutes = Math.floor((diff / 1000 % 3600) / 60);
        const seconds = Math.floor(diff / 1000 % 60);
        setCountdown(`${hours}ч ${minutes}м ${seconds}с`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [serverInfo]);

  if (err) return <p className="profile-error">{err}</p>;
  if (!profile) return <p className="profile-loading">Загрузка...</p>;

  return (
    <div className="profile-container">
      <h1 className="profile-title">Мой профиль</h1>

      <Avatar
        userId={profile.id}
        avatarPath={profile.avatar_path}
        onChange={(newPath) => setProfile({ ...profile, avatar_path: newPath })}
      />

      <p><strong>Имя:</strong> {profile.username}</p>
      <p><strong>Баллы:</strong> {profile.points}</p>
      <p>
        <strong>Статус:</strong>{' '}
        {profile.vip ? 'VIP ✅' : 'Обычный пользователь'}
      </p>

      {/* Кнопка перехода к правилам сервера */}
      <div className="profile-actions">
        <Link to="/server-rules" className="profile-button">
          📜 Правила сервера
        </Link>
      </div>

      {serverInfo && (
        <div className="profile-server">
          <h3>⚡ Сервер запущен</h3>
          <p><strong>Название:</strong> {serverInfo.name || '—'}</p>
          <p><strong>Приз:</strong> {serverInfo.prize || '—'}</p>
          <p>Старт: {serverInfo.start.toLocaleString('ru-RU')}</p>
          <p>До конца вайпа осталось: {countdown}</p>
        </div>
      )}
    </div>
  );
}
