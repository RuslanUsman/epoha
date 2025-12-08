// src/pages/Requests.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import UserAvatar from '../components/UserAvatar';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function loadRequests() {
    if (!user) return;
    const { data } = await supabase
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

    setRequests(data || []);
  }

  useEffect(() => {
    if (!user) return;
    loadRequests();

    const channel = supabase
      .channel('requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function acceptRequest(reqId) {
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', reqId);
    loadRequests();
  }

  async function rejectRequest(reqId) {
    await supabase.from('friends').delete().eq('id', reqId);
    loadRequests();
  }

  return (
    <div style={{ maxWidth: 600, margin: '20px auto' }}>
      <h1>Заявки в друзья ({requests.length})</h1>

      {requests.length === 0 && <p>Нет новых заявок.</p>}

      {requests.map(r => (
        <div
          key={r.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 6
          }}
        >
          <UserAvatar userId={r.requester_profile.id} avatarPath={r.requester_profile.avatar_path} size={50} />
          <span style={{ flex: 1 }}>{r.requester_profile.username}</span>
          <button onClick={() => acceptRequest(r.id)}>Принять</button>
          <button onClick={() => rejectRequest(r.id)}>Отклонить</button>
        </div>
      ))}
    </div>
  );
}
