// src/pages/ServerRules.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import '../styles/global.css';

export default function ServerRules() {
  const [rules, setRules] = useState([]);
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    const { data, error } = await supabase
      .from('server_rules')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error) setRules(data || []);
  }

  function toggleSection(id) {
    setOpenSection(openSection === id ? null : id);
  }

  return (
    <div className="rules-container">
      <h1>📜 Правила сервера</h1>

      {/* Список разделов */}
      <div className="rules-list">
        {rules.map(r => (
          <div key={r.id} className="rule-card">
            <button
              className={`rule-button ${openSection === r.id ? 'active' : ''}`}
              onClick={() => toggleSection(r.id)}
            >
              {r.section}
            </button>

            {openSection === r.id && (
              <div className="rule-content-box">
                <p className="rule-content">{r.content}</p>
                <small className="rule-updated">
                  Обновлено: {new Date(r.updated_at).toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </small>
              </div>
            )}
          </div>
        ))}

        {rules.length === 0 && (
          <p className="admin-empty">Правила пока не добавлены.</p>
        )}
      </div>

      {/* Кнопка назад */}
      <Link to="/profile" className="back-button">⬅ Назад</Link>
    </div>
  );
}
