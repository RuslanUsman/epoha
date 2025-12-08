// src/pages/FriendsList.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import '../styles/global.css'; // подключаем глобальные стили

export default function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function loadFriends() {
    if (!user) return;
    const { data: f } = await supabase
      .from('friends')
      .select(`
        id,
        status,
        requester,
        receiver,
        requester_profile:profiles!friends_requester_fkey(id, username, avatar_path),
        receiver_profile:profiles!friends_receiver_fkey(id, username, avatar_path)
      `)
      .or(`requester.eq.${user.id},receiver.eq.${user.id}`);
    
    setFriends(f?.filter(r => r.status === 'accepted') || []);
  }

  useEffect(() => {
    if (!user) return;
    loadFriends();

    const friendsChannel = supabase
      .channel('friends-list-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        () => loadFriends()
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('friends-profiles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        payload => {
          const updated = payload.new;
          setFriends(prev =>
            prev.map(f => {
              const rp = f.requester_profile?.id === updated.id
                ? { ...f.requester_profile, ...updated }
                : f.requester_profile;
              const sp = f.receiver_profile?.id === updated.id
                ? { ...f.receiver_profile, ...updated }
                : f.receiver_profile;
              return { ...f, requester_profile: rp, receiver_profile: sp };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user]);

  async function removeFriend(reqId) {
    await supabase.from('friends').delete().eq('id', reqId);
    loadFriends();
  }

  return (
    <div className="friendslist-container">
      <button onClick={() => navigate(-1)} className="friendslist-back">
        ← Назад
      </button>
      <h1 className="friendslist-title">Мои друзья ({friends.length})</h1>

      {friends.length === 0 && <p className="friendslist-empty">У вас пока нет друзей.</p>}

      {friends.map(f => {
        const friendProfile = f.requester === user.id ? f.receiver_profile : f.requester_profile;
        return (
          <div key={f.id} className="friendslist-card">
            <UserAvatar userId={friendProfile.id} avatarPath={friendProfile.avatar_path} size={60} />
            <span className="friendslist-username">{friendProfile.username}</span>
            <Link to={`/profile/${friendProfile.id}`} className="friendslist-link">Профиль</Link>
            <button className="friendslist-remove" onClick={() => removeFriend(f.id)}>Удалить</button>
          </div>
        );
      })}
    </div>
  );
}
