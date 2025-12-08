// src/components/UserAvatar.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function UserAvatar({ userId, avatarPath, size = 100 }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (avatarPath) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
      setUrl(data.publicUrl);
    }
  }, [avatarPath]);

  return (
    <div style={{ textAlign: 'center' }}>
      {url ? (
        <img
          src={url}
          alt="User Avatar"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #ccc'
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: '#ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: '#555'
          }}
        >
          Нет фото
        </div>
      )}
    </div>
  );
}
