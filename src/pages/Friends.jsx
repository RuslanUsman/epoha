// src/pages/Friends.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import '../styles/global.css'; // подключаем глобальные стили

export default function Friends() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!query.length) { setResults([]); return; }
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `${query}%`);
      setResults(data || []);
    };
    fetchUsers();
  }, [query]);

  async function loadFriends() {
    if (!user) return;
    const { data: f } = await supabase
      .from('friends')
      .select('id,status,requester,receiver')
      .or(`requester.eq.${user.id},receiver.eq.${user.id}`);
    setFriends(f || []);

    const { data: r } = await supabase
      .from('friends')
      .select(`
        id,
        status,
        requester,
        receiver,
        requester_profile:profiles!friends_requester_fkey(id, username, avatar_path)
      `)
      .eq('receiver', user.id)
      .eq('status', 'pending');
    setRequests(r || []);
  }

  useEffect(() => {
    if (!user) return;
    loadFriends();

    const channel = supabase
      .channel('friends-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        () => loadFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function sendRequest(targetId) {
    await supabase.from('friends').insert({
      requester: user.id,
      receiver: targetId,
      status: 'pending'
    });
    loadFriends();
  }

  async function cancelRequest(targetId) {
    await supabase
      .from('friends')
      .delete()
      .or(`and(requester.eq.${user.id},receiver.eq.${targetId}),and(requester.eq.${targetId},receiver.eq.${user.id})`);
    loadFriends();
  }

  async function acceptRequest(reqId) {
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', reqId);
    loadFriends();
  }

  async function rejectRequest(reqId) {
    await supabase.from('friends').delete().eq('id', reqId);
    loadFriends();
  }

  return (
    <div className="friends-container">
      <h1 className="friends-title">Поиск пользователей</h1>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Введите имя..."
        className="friends-input"
      />

      {results.map(u => {
        const relation = friends.find(f =>
          (f.requester === u.id && f.receiver === user.id) ||
          (f.receiver === u.id && f.requester === user.id)
        );

        let actionBtn;
        if (relation) {
          if (relation.status === 'pending') {
            if (relation.requester === user.id) {
              actionBtn = <button className="friends-button cancel" onClick={() => cancelRequest(u.id)}>Отменить</button>;
            } else {
              actionBtn = <span className="friends-status pending">Ожидает подтверждения</span>;
            }
          } else if (relation.status === 'accepted') {
            actionBtn = <span className="friends-status accepted">Уже в друзьях</span>;
          }
        } else {
          actionBtn = <button className="friends-button add" onClick={() => sendRequest(u.id)}>Добавить</button>;
        }

        return (
          <div key={u.id} className="friends-card">
            <UserAvatar userId={u.id} avatarPath={u.avatar_path} size={50} />
            <span className="friends-username">{u.username}</span>
            {actionBtn}
            <Link to={`/profile/${u.id}`} className="friends-link">Профиль</Link>
          </div>
        );
      })}

      <Link to="/friends-list" className="friends-counter">
        Мои друзья ({friends.filter(f => f.status === 'accepted').length})
      </Link>

      <div className="friends-requests">
        <h2>Заявки ({requests.length})</h2>
        {requests.length === 0 && <p className="friends-empty">Нет новых заявок.</p>}
        {requests.map(r => (
          <div key={r.id} className="friends-card">
            <UserAvatar userId={r.requester_profile.id} avatarPath={r.requester_profile.avatar_path} size={50} />
            <span className="friends-username">{r.requester_profile.username}</span>
            <button className="friends-button accept" onClick={() => acceptRequest(r.id)}>Принять</button>
            <button className="friends-button reject" onClick={() => rejectRequest(r.id)}>Отклонить</button>
          </div>
        ))}
      </div>
    </div>
  );
}
