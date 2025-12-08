// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import '../styles/global.css';

export default function Footer() {
  const [user, setUser] = useState(null);
  const [unreadUsers, setUnreadUsers] = useState(0);
  const [friendRequests, setFriendRequests] = useState(0);
  const { count } = useCart();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // 🔧 непрочитанные сообщения
  async function loadUnreadMessages(uid) {
    if (!uid) return;
    const { data } = await supabase
      .from('messages')
      .select('sender')
      .eq('receiver', uid)
      .eq('read', false);

    const uniqueSenders = new Set((data || []).map(m => m.sender));
    setUnreadUsers(uniqueSenders.size);
  }

  // 🔧 заявки в друзья
  async function loadFriendRequests(uid) {
    if (!uid) return;
    const { data } = await supabase
      .from('friends')
      .select('id')
      .eq('receiver', uid)
      .eq('status', 'pending');

    setFriendRequests(data?.length || 0);
  }

  useEffect(() => {
    if (!user?.id) return;

    loadUnreadMessages(user.id);
    loadFriendRequests(user.id);

    const channel = supabase
      .channel('footer-realtime')
      // сообщения
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `receiver=eq.${user.id}` },
        payload => {
          console.log('MESSAGE event:', payload);
          loadUnreadMessages(user.id);
        }
      )
      // заявки: INSERT
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friends', filter: `receiver=eq.${user.id}` },
        payload => {
          console.log('FRIEND INSERT:', payload);
          loadFriendRequests(user.id);
        }
      )
      // заявки: UPDATE (принятие)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friends', filter: `receiver=eq.${user.id}` },
        payload => {
          console.log('FRIEND UPDATE:', payload);
          loadFriendRequests(user.id);
        }
      )
      // заявки: DELETE (отклонение)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'friends' },
        payload => {
          console.log('FRIEND DELETE:', payload);
          // пересчитываем всегда, без проверки receiver
          loadFriendRequests(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <footer className="footer">
      <Link to="/friends" className="footer-link">
        Друзья {friendRequests > 0 && <span className="footer-badge">({friendRequests})</span>}
      </Link>

      <Link to="/dialogs" className="footer-link">
        Диалоги {unreadUsers > 0 && <span className="footer-badge">({unreadUsers})</span>}
      </Link>

      <Link to="/shop" className="footer-link">Магазин</Link>

      <Link to="/cart" className="footer-link cart-link">
        Корзина
        {count > 0 && <span className="cart-count">{count}</span>}
      </Link>
    </footer>
  );
}
