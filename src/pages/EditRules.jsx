// src/pages/EditRules.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import '../styles/global.css';

export default function EditRules() {
  const [rules, setRules] = useState([]);
  const [section, setSection] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    const { data } = await supabase
      .from('server_rules')
      .select('*')
      .order('updated_at', { ascending: false });
    setRules(data || []);
  }

  async function saveRule() {
    if (!section.trim() || !content.trim()) return;
    await supabase.from('server_rules').upsert({
      id: editingId || undefined,
      section,
      content,
      updated_at: new Date().toISOString()
    });
    setEditingId(null);
    setSection('');
    setContent('');
    loadRules();
  }

  return (
    <div className="rules-container">
      <h1>✏️ Редактирование правил</h1>

      {rules.map(r => (
        <div key={r.id} className="rule-card">
          <h2>{r.section}</h2>
          <p>{r.content}</p>
          <small>Обновлено: {new Date(r.updated_at).toLocaleDateString('ru-RU')}</small>
          <button onClick={() => {
            setEditingId(r.id);
            setSection(r.section);
            setContent(r.content);
          }}>Редактировать</button>
        </div>
      ))}

      <div className="rule-editor">
        <input
          value={section}
          onChange={e => setSection(e.target.value)}
          placeholder="Название раздела"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Текст правил"
        />
        <button onClick={saveRule}>Сохранить</button>
      </div>

      <Link to="/admin" className="back-button">⬅ Назад в админку</Link>
    </div>
  );
}
