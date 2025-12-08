// src/pages/Chat.jsx
import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import UserAvatar from '../components/UserAvatar';
import EmojiPicker from 'emoji-picker-react';
import '../styles/global.css'; // ✅ подключаем глобальные стили

export default function Chat() {
  const { partnerId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [user, setUser] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function loadMessages() {
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
      .or(`and(sender.eq.${user.id},receiver.eq.${partnerId}),and(sender.eq.${partnerId},receiver.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver', user.id)
      .eq('sender', partnerId)
      .eq('read', false);
  }

  useEffect(() => {
    if (!user) return;
    loadMessages();

    const channel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async payload => {
          const newMsg = payload.new;

          if (
            (newMsg.sender === user.id && newMsg.receiver === partnerId) ||
            (newMsg.sender === partnerId && newMsg.receiver === user.id)
          ) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, username, avatar_path')
              .eq('id', newMsg.sender)
              .single();

            newMsg.sender_profile = senderProfile;
            setMessages(prev => [...prev, newMsg]);

            if (newMsg.receiver === user.id && newMsg.sender === partnerId) {
              supabase.from('messages').update({ read: true }).eq('id', newMsg.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        payload => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!text.trim()) return;
    await supabase.from('messages').insert({
      sender: user.id,
      receiver: partnerId,
      content: text,
      created_at: new Date().toISOString(),
      read: false
    });
    setText('');
  }

  function onEmojiClick(emojiData) {
    setText(prev => prev + emojiData.emoji);
    setShowEmoji(false);
  }

  return (
    <div className="container chat-container">
      <h2 className="chat-title">Чат</h2>

      <div className="chat-messages">
        {messages.map(m => {
          const isMine = m.sender === user.id;
          const senderProfile = m.sender_profile || {};
          return (
            <div
              key={m.id}
              className={`chat-row ${isMine ? 'mine' : 'theirs'}`}
            >
              {!isMine && (
                <UserAvatar
                  userId={senderProfile.id}
                  avatarPath={senderProfile.avatar_path}
                  size={40}
                />
              )}
              <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                <div className="message-meta">
                  {isMine ? 'Я' : senderProfile.username} •{' '}
                  {new Date(m.created_at).toLocaleTimeString()}
                </div>
                <div className="message-content">{m.content}</div>
              </div>
              {isMine && (
                <UserAvatar
                  userId={senderProfile.id}
                  avatarPath={senderProfile.avatar_path}
                  size={40}
                />
              )}
            </div>
          );
        })}
        <div ref={bottomRef}></div>
      </div>

      {/* Панель ввода */}
      <div className="chat-input-bar">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Введите сообщение..."
          className="chat-input"
        />
        <button className="chat-button" onClick={sendMessage}>Отправить</button>
        <button className="chat-button" onClick={() => setShowEmoji(prev => !prev)}>😊</button>
      </div>

      {showEmoji && (
        <div className="emoji-picker">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
    </div>
  );
}
