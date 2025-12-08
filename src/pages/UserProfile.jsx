// src/pages/UserProfile.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import UserAvatar from '../components/UserAvatar';
import { FaRegCommentDots } from 'react-icons/fa';
import '../styles/global.css'; // подключаем стили

export default function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (!error) setProfile(data);

      const channel = supabase
        .channel('profiles-realtime')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          payload => {
            if (payload.new.id === id) {
              setProfile(payload.new);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    loadProfile();
  }, [id]);

  async function giftPoints() {
    setErr('');
    setSuccess('');
    const num = parseInt(amount);
    if (!num || num <= 0) {
      setErr('Введите количество баллов.');
      return;
    }
    const { error } = await supabase.rpc('gift_points', { target: id, amount: num });
    if (error) {
      if (error.message.includes('Недостаточно баллов')) {
        setErr('У вас недостаточно баллов для подарка.');
      } else {
        setErr(error.message);
      }
    } else {
      setSuccess(`Вы подарили ${num} баллов пользователю ${profile.username}`);
      setAmount('');
    }
  }

  if (!profile) return <p>Загрузка...</p>;

  return (
    <div className="userProfile-container">
      <h1 className="userProfile-title">Профиль пользователя</h1>
      <UserAvatar userId={profile.id} avatarPath={profile.avatar_path} size={120} />

      <p><strong>Имя:</strong> {profile.username}</p>
      <p><strong>Баллы:</strong> {profile.points}</p>
      <p>
        <strong>Статус:</strong>{' '}
        {profile.vip ? 'VIP ✅' : 'Обычный пользователь'}
      </p>

      <h3 className="userProfile-subtitle">Подарить баллы</h3>
      <div className="userProfile-gift">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Количество баллов"
          className="userProfile-input"
        />
        <button onClick={giftPoints} className="userProfile-button">Подарить</button>
      </div>

      {err && <p className="userProfile-error">{err}</p>}
      {success && <p className="userProfile-success">{success}</p>}

      <div className="userProfile-chat">
        <button
          onClick={() => navigate(`/chat/${profile.id}`)}
          className="userProfile-button chat"
        >
          <FaRegCommentDots /> Написать
        </button>
      </div>
    </div>
  );
}
