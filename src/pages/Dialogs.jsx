// src/pages/Dialogs.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import '../styles/global.css'; // подключаем глобальные стили

export default function Dialogs() {
  const [user, setUser] = useState(null);
  const [dialogs, setDialogs] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function loadDialogs() {
    if (!user) return;

    const { data } = await supabase
      .from('messages')
      .select(`
        id,
        sender,
        receiver,
        content,
        created_at,
        read,
        sender_profile:profiles!messages_sender_fkey(id, username, avatar_path),
        receiver_profile:profiles!messages_receiver_fkey(id, username, avatar_path)
      `)
      .or(`sender.eq.${user.id},receiver.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!data) return;

    const map = new Map();
    for (const m of data) {
      const partner = m.sender === user.id ? m.receiver_profile : m.sender_profile;
      if (!map.has(partner.id)) {
        map.set(partner.id, {
          partner,
          lastMessage: m,
          unreadCount: 0
        });
      }
      if (m.receiver === user.id && !m.read) {
        map.get(partner.id).unreadCount++;
      }
    }
    setDialogs(Array.from(map.values()));
  }

  useEffect(() => {
    if (!user) return;
    loadDialogs();

    const channel = supabase
      .channel('dialogs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => loadDialogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="dialogs-container">
      <h1 className="dialogs-title">Диалоги</h1>
      {dialogs.length === 0 && <p className="dialogs-empty">Нет сообщений.</p>}
      {dialogs.map(d => (
        <div key={d.partner.id} className="dialog-card">
          <UserAvatar
            userId={d.partner.id}
            avatarPath={d.partner.avatar_path}
            size={50}
          />
          <div className="dialog-info">
            <strong className="dialog-username">{d.partner.username}</strong>
            <div className="dialog-last">{d.lastMessage.content}</div>
          </div>
          {d.unreadCount > 0 && (
            <span className="dialog-unread">{d.unreadCount}</span>
          )}
          <Link to={`/chat/${d.partner.id}`} className="dialog-button">
            Ответить
          </Link>
        </div>
      ))}
    </div>
  );
}
