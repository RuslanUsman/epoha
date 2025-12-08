// src/components/Avatar.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Avatar({ userId, avatarPath, onChange }) {
  const [url, setUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Загружаем картинку по пути из storage
  useEffect(() => {
    if (avatarPath) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
      setUrl(data.publicUrl);
    }
  }, [avatarPath]);

  // Загрузка нового файла
  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      // ✅ уникальное имя файла, чтобы не было конфликтов
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Загружаем в bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        alert('Ошибка загрузки: ' + uploadError.message);
        throw uploadError;
      }

      // Обновляем профиль в таблице
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_path: filePath })
        .eq('id', userId);

      if (updateError) {
        alert('Ошибка обновления профиля: ' + updateError.message);
        throw updateError;
      }

      // Сообщаем родителю о новом пути
      if (onChange) onChange(filePath);

    } catch (error) {
      console.error('Ошибка загрузки аватара:', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      {url ? (
        <img
          src={url}
          alt="Avatar"
          style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: 120,
            height: 120,
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

      <div style={{ marginTop: 8 }}>
        <label
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: '#007bff',
            color: '#fff',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {uploading ? 'Загрузка...' : 'Изменить'}
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
