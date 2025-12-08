// src/pages/Admin.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import UserAvatar from '../components/UserAvatar';
import '../styles/global.css'; // подключаем стили

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [vipCount, setVipCount] = useState(0);
  const [showUsers, setShowUsers] = useState(false);
  const [pointsInput, setPointsInput] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showVipOnly, setShowVipOnly] = useState(false);

  // 🔧 настройки сервера
  const [serverDuration, setServerDuration] = useState('');
  const [serverEndTime, setServerEndTime] = useState(null);
  const [serverName, setServerName] = useState('');
  const [serverPrize, setServerPrize] = useState('');

  // 🔧 глобальная распродажа
  const [salePercent, setSalePercent] = useState('');
  const [saleEndInput, setSaleEndInput] = useState('');
  const [saleEndTime, setSaleEndTime] = useState(null);
  const [saleCountdown, setSaleCountdown] = useState('');

  // 🔧 обратный отсчёт сервера
  const [countdown, setCountdown] = useState('');

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_path, is_vip, points')
      .order('username', { ascending: true });

    setUsers(data || []);
    setTotalCount(data?.length || 0);
    setVipCount(data?.filter(u => u.is_vip).length || 0);
  }

  useEffect(() => {
    loadUsers();
    loadServerSettings();
    loadSaleSettings();
  }, []);

  async function toggleVip(userId, currentStatus) {
    await supabase.from('profiles').update({ is_vip: !currentStatus }).eq('id', userId);
    loadUsers();
  }

  async function addPoints(userId) {
    const amount = parseInt(pointsInput[userId] || 0, 10);
    if (!amount) return;
    await supabase.rpc('add_points', { user_id: userId, amount });
    setPointsInput(prev => ({ ...prev, [userId]: '' }));
    loadUsers();
  }
  // 🔧 загрузка настроек сервера
  async function loadServerSettings() {
    const { data } = await supabase
      .from('server_settings')
      .select('start_time, duration_seconds, server_name, prize')
      .eq('id', 1)
      .single();

    if (data) {
      const endTime = new Date(new Date(data.start_time).getTime() + data.duration_seconds * 1000);
      setServerEndTime(endTime);
      setServerDuration(data.duration_seconds);
      setServerName(data.server_name || '');
      setServerPrize(data.prize || '');
    }
  }

  // 🔧 сохранение настроек сервера
  async function saveServerSettings() {
    const duration = parseInt(serverDuration, 10);
    if (!duration) return;

    const start = new Date().toISOString();
    await supabase
      .from('server_settings')
      .upsert({ id: 1, start_time: start, duration_seconds: duration, server_name: serverName, prize: serverPrize });

    setServerEndTime(new Date(Date.now() + duration * 1000));
  }

  // 🔧 удалить сервер
  async function deleteServer() {
    await supabase.from('server_settings').delete().eq('id', 1);
    setServerEndTime(null);
    setServerDuration('');
    setServerName('');
    setServerPrize('');
  }

  // 🔧 таймер обратного отсчёта сервера
  useEffect(() => {
    if (!serverEndTime) return;
    const interval = setInterval(() => {
      const diff = serverEndTime.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Сервер завершён');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 1000 / 3600);
        const m = Math.floor((diff / 1000 % 3600) / 60);
        const s = Math.floor(diff / 1000 % 60);
        setCountdown(`${h}ч ${m}м ${s}с`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [serverEndTime]);

  // 🔧 таймер обратного отсчёта распродажи
  useEffect(() => {
    if (!saleEndTime) return;
    const interval = setInterval(() => {
      const diff = saleEndTime.getTime() - Date.now();
      if (diff <= 0) {
        setSaleCountdown('Распродажа завершена');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 1000 / 3600);
        const m = Math.floor((diff / 1000 % 3600) / 60);
        const s = Math.floor(diff / 1000 % 60);
        setSaleCountdown(`${h}ч ${m}м ${s}с`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [saleEndTime]);

  // 🔧 загрузка распродажи
  async function loadSaleSettings() {
    const { data } = await supabase
      .from('sale_settings')
      .select('start_time, end_time, discount_percent')
      .eq('id', 1)
      .single();

    if (data) {
      setSalePercent(data.discount_percent);
      setSaleEndTime(new Date(data.end_time));
      setSaleEndInput(new Date(data.end_time).toISOString().slice(0, 16));
    }
  }

  async function startSale() {
    const percent = parseInt(salePercent, 10);
    if (!percent || !saleEndInput) return;

    const start = new Date().toISOString();
    const end = new Date(saleEndInput).toISOString();

    await supabase.from('sale_settings').upsert({
      id: 1,
      start_time: start,
      end_time: end,
      discount_percent: percent
    });

    setSaleEndTime(new Date(end));
  }

  async function deleteSale() {
    await supabase.from('sale_settings').delete().eq('id', 1);
    setSaleEndTime(null);
    setSalePercent('');
    setSaleEndInput('');
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVip = showVipOnly ? u.is_vip : true;
    return matchesSearch && matchesVip;
  });
  return (
    <div className="admin-container">
      <h1 className="admin-title">Админ панель</h1>
      <p>Всего пользователей: {totalCount}</p>
      <p>VIP пользователей: {vipCount}</p>

      {/* 🔧 блок настроек сервера */}
      <div className="admin-block">
        <h2>Настройки сервера</h2>
        <input
          type="text"
          value={serverName}
          onChange={e => setServerName(e.target.value)}
          placeholder="Название сервера"
          className="admin-input"
        />
        <input
          type="text"
          value={serverPrize}
          onChange={e => setServerPrize(e.target.value)}
          placeholder="Приз"
          className="admin-input"
        />
        <input
          type="number"
          value={serverDuration}
          onChange={e => setServerDuration(e.target.value)}
          placeholder="Время работы (секунды)"
          className="admin-input"
        />
        <button onClick={saveServerSettings} className="admin-button">Запустить сервер</button>
        <button onClick={deleteServer} className="admin-button danger">Удалить сервер</button>
        {serverEndTime && <p>⏳ Сервер закроется через: {countdown}</p>}
      </div>

      {/* 🔧 блок глобальной распродажи */}
      <div className="admin-block">
        <h2>Глобальная распродажа</h2>
        <input
          type="number"
          value={salePercent}
          onChange={e => setSalePercent(e.target.value)}
          placeholder="Скидка %"
          className="admin-input"
        />
        <input
          type="datetime-local"
          value={saleEndInput}
          onChange={e => setSaleEndInput(e.target.value)}
          className="admin-input"
        />
        <button onClick={startSale} className="admin-button">Запустить распродажу</button>
        <button onClick={deleteSale} className="admin-button danger">Удалить распродажу</button>
        {saleEndTime && <p>⏳ До конца распродажи: {saleCountdown}</p>}
      </div>

      {/* Кнопки управления */}
      <div className="admin-actions">
        <button onClick={() => setShowUsers(prev => !prev)} className="admin-button primary">
          {showUsers ? 'Скрыть пользователей' : 'Показать пользователей'}
        </button>
        <button onClick={() => setShowVipOnly(prev => !prev)} className={`admin-button ${showVipOnly ? 'danger' : 'success'}`}>
          {showVipOnly ? 'Показать всех' : 'Показать только VIP'}
        </button>
        <Link to="/admin-shop" className="admin-link violet">Управление магазином</Link>
        <Link to="/admin-orders" className="admin-link yellow">Заказы</Link>
        <Link to="/edit-rules" className="admin-link blue">Редактировать правила</Link> {/* ✅ новая кнопка */}
      </div>

      {showUsers && (
        <div className="admin-users">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Поиск пользователя..."
            className="admin-input full"
          />

          {filteredUsers.map(u => (
            <div key={u.id} className="admin-user-card">
              <UserAvatar userId={u.id} avatarPath={u.avatar_path} size={50} />
              <div className="admin-user-info">
                <strong>{u.username}</strong>
                <div>Баллы: {u.points}</div>
                <div>VIP: {u.is_vip ? 'Да' : 'Нет'}</div>
              </div>
              <button onClick={() => toggleVip(u.id, u.is_vip)} className="admin-button small">
                {u.is_vip ? 'Снять VIP' : 'Дать VIP'}
              </button>
              <div className="admin-points">
                <input
                  type="number"
                  value={pointsInput[u.id] || ''}
                  onChange={e =>
                    setPointsInput(prev => ({
                      ...prev,
                      [u.id]: e.target.value
                    }))
                  }
                  placeholder="Баллы"
                  className="admin-input small"
                />
                <button onClick={() => addPoints(u.id)} className="admin-button small">Начислить</button>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <p className="admin-empty">Пользователь не найден</p>
          )}
        </div>
      )}
    </div>
  );
}
