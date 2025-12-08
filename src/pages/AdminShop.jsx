// src/pages/AdminShop.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css'; // подключаем глобальные стили

function EditProductModal({ product, cats, onSave, onClose }) {
  const [form, setForm] = useState({
    ...product,
    imageFile: null,
    available_hours: Math.floor((product.available_after_seconds || 0) / 3600),
    available_minutes: Math.floor(((product.available_after_seconds || 0) % 3600) / 60)
  });

  async function handleSave() {
    let imagePath = form.image_path;
    if (form.imageFile) {
      const fileExt = form.imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const { error } = await supabase.storage.from('products').upload(filePath, form.imageFile);
      if (!error) {
        imagePath = filePath;
      }
    }

    const totalSeconds =
      (parseInt(form.available_hours || 0, 10) * 3600) +
      (parseInt(form.available_minutes || 0, 10) * 60);

    await supabase
      .from('products')
      .update({
        title: form.title,
        description: form.description,
        price_rub: Number(form.price_rub),
        price_points: Number(form.price_points),
        is_active: form.is_active,
        image_path: imagePath,
        category_id: form.category_id,
        available_after_seconds: totalSeconds,
        always_available: form.always_available
      })
      .eq('id', product.id);

    onSave();
    onClose();
  }

  return (
    <div className="adminshop-modal">
      <h3>Редактировать товар</h3>
      <input
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        className="adminshop-input"
      />
      <textarea
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        className="adminshop-textarea"
      />
      <input
        type="number"
        value={form.price_rub}
        onChange={e => setForm(f => ({ ...f, price_rub: e.target.value }))}
        className="adminshop-input"
      />
      <input
        type="number"
        value={form.price_points}
        onChange={e => setForm(f => ({ ...f, price_points: e.target.value }))}
        className="adminshop-input"
      />
      <select
        value={form.category_id}
        onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
        className="adminshop-select"
      >
        {cats.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      <input
        type="file"
        accept="image/*"
        onChange={e => setForm(f => ({ ...f, imageFile: e.target.files[0] }))}
        className="adminshop-file"
      />
      <label className="adminshop-checkbox">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
        /> Активен
      </label>
      <label className="adminshop-checkbox">
        <input
          type="checkbox"
          checked={form.always_available}
          onChange={e => setForm(f => ({ ...f, always_available: e.target.checked }))}
        /> Всегда доступен
      </label>
      {!form.always_available && (
        <div className="adminshop-time">
          <input
            type="number"
            value={form.available_hours}
            onChange={e => setForm(f => ({ ...f, available_hours: e.target.value }))}
            placeholder="Часы"
            className="adminshop-input small"
          />
          <input
            type="number"
            value={form.available_minutes}
            onChange={e => setForm(f => ({ ...f, available_minutes: e.target.value }))}
            placeholder="Минуты"
            className="adminshop-input small"
          />
        </div>
      )}
      <div className="adminshop-actions">
        <button onClick={handleSave} className="adminshop-button">Сохранить</button>
        <button onClick={onClose} className="adminshop-button cancel">Отмена</button>
      </div>
    </div>
  );
}

export default function AdminShop() {
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState({ title: '', slug: '' });
  const [products, setProducts] = useState([]);
  const [prod, setProd] = useState({
    category_id: '',
    title: '',
    description: '',
    price_rub: '',
    price_points: '',
    is_active: true,
    imageFile: null,
    available_hours: '',
    available_minutes: '',
    always_available: false
  });
  const [editing, setEditing] = useState(null);
  async function loadCats() {
    const { data } = await supabase.from('product_categories').select('*').order('title');
    setCats(data || []);
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
  }

  useEffect(() => {
    loadCats();
    loadProducts();
  }, []);

  async function createCategory() {
    if (!newCat.title || !newCat.slug) return;
    await supabase.from('product_categories').insert(newCat);
    setNewCat({ title: '', slug: '' });
    loadCats();
  }

  async function deleteCategory(id) {
    await supabase.from('product_categories').delete().eq('id', id);
    loadCats();
  }

  async function createProduct() {
    if (!prod.category_id || !prod.title) return;
    let imagePath = null;
    if (prod.imageFile) {
      const fileExt = prod.imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const { error } = await supabase.storage.from('products').upload(filePath, prod.imageFile);
      if (!error) {
        imagePath = filePath;
      }
    }

    const totalSeconds =
      (parseInt(prod.available_hours || 0, 10) * 3600) +
      (parseInt(prod.available_minutes || 0, 10) * 60);

    await supabase.from('products').insert({
      category_id: prod.category_id,
      title: prod.title,
      description: prod.description || null,
      price_rub: Number(prod.price_rub || 0),
      price_points: Number(prod.price_points || 0),
      is_active: prod.is_active,
      image_path: imagePath,
      available_after_seconds: totalSeconds,
      always_available: prod.always_available
    });

    setProd({
      category_id: '',
      title: '',
      description: '',
      price_rub: '',
      price_points: '',
      is_active: true,
      imageFile: null,
      available_hours: '',
      available_minutes: '',
      always_available: false
    });
    loadProducts();
  }

  async function deleteProduct(id) {
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  }

  async function toggleProductActive(id, current) {
    await supabase.from('products').update({ is_active: !current }).eq('id', id);
    loadProducts();
  }
  return (
    <div className="adminshop-container">
      <h2>Управление магазином</h2>

      {/* Категории */}
      <div className="adminshop-block">
        <h3>Категории</h3>
        <input
          value={newCat.title}
          onChange={e => setNewCat(c => ({ ...c, title: e.target.value }))}
          placeholder="Название категории"
          className="adminshop-input"
        />
        <input
          value={newCat.slug}
          onChange={e => setNewCat(c => ({ ...c, slug: e.target.value.trim().toLowerCase() }))}
          placeholder="Slug"
          className="adminshop-input"
        />
        <button onClick={createCategory} className="adminshop-button">Создать</button>

        <ul className="adminshop-list">
          {cats.map(c => (
            <li key={c.id} className="adminshop-list-item">
              {c.title} ({c.slug})
              <button onClick={() => deleteCategory(c.id)} className="adminshop-button danger">Удалить</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Добавление товара */}
      <div className="adminshop-block">
        <h3>Добавить товар</h3>
        <select
          value={prod.category_id}
          onChange={e => setProd(p => ({ ...p, category_id: e.target.value }))}
          className="adminshop-select"
        >
          <option value="">Выберите категорию</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <input
          value={prod.title}
          onChange={e => setProd(p => ({ ...p, title: e.target.value }))}
          placeholder="Название товара"
          className="adminshop-input"
        />
        <input
          type="file"
          accept="image/*"
          onChange={e => setProd(p => ({ ...p, imageFile: e.target.files[0] }))}
          className="adminshop-file"
        />
        <textarea
          value={prod.description}
          onChange={e => setProd(p => ({ ...p, description: e.target.value }))}
          placeholder="Описание"
          rows={3}
          className="adminshop-textarea"
        />
        <div className="adminshop-prices">
          <input
            type="number"
            value={prod.price_rub}
            onChange={e => setProd(p => ({ ...p, price_rub: e.target.value }))}
            placeholder="Цена руб"
            className="adminshop-input small"
          />
          <input
            type="number"
            value={prod.price_points}
            onChange={e => setProd(p => ({ ...p, price_points: e.target.value }))}
            placeholder="Цена баллы"
            className="adminshop-input small"
          />
          <label className="adminshop-checkbox">
            <input
              type="checkbox"
              checked={prod.is_active}
              onChange={e => setProd(p => ({ ...p, is_active: e.target.checked }))}
            /> Активен
          </label>
        </div>
        <label className="adminshop-checkbox">
          <input
            type="checkbox"
            checked={prod.always_available}
            onChange={e => setProd(p => ({ ...p, always_available: e.target.checked }))}
          /> Всегда доступен
        </label>
        {!prod.always_available && (
          <div className="adminshop-time">
            <input
              type="number"
              value={prod.available_hours}
              onChange={e => setProd(p => ({ ...p, available_hours: e.target.value }))}
              placeholder="Часы"
              className="adminshop-input small"
            />
            <input
              type="number"
              value={prod.available_minutes}
              onChange={e => setProd(p => ({ ...p, available_minutes: e.target.value }))}
              placeholder="Минуты"
              className="adminshop-input small"
            />
          </div>
        )}
        <button onClick={createProduct} className="adminshop-button">Добавить товар</button>
      </div>

      {/* Список товаров */}
      <div className="adminshop-block">
        <h3>Товары</h3>
        <div className="adminshop-grid">
          {products.map(p => (
            <div key={p.id} className="adminshop-card">
              {p.image_path && (
                <img
                  src={supabase.storage.from('products').getPublicUrl(p.image_path).data.publicUrl}
                  alt={p.title}
                  className="adminshop-image"
                />
              )}
              <h4>{p.title}</h4>
              <p>Руб: {p.price_rub} | Баллы: {p.price_points}</p>
              <p>Категория: {cats.find(c => c.id === p.category_id)?.title || '—'}</p>
              <p>{p.always_available ? 'Всегда доступен' : `Доступен через: ${Math.floor((p.available_after_seconds || 0) / 3600)}ч ${Math.floor(((p.available_after_seconds || 0) % 3600) / 60)}м`}</p>
              <button onClick={() => toggleProductActive(p.id, p.is_active)} className="adminshop-button small">
                {p.is_active ? 'Скрыть' : 'Активировать'}
              </button>
              <button onClick={() => setEditing(p)} className="adminshop-button small">Редактировать</button>
              <button onClick={() => deleteProduct(p.id)} className="adminshop-button danger small">Удалить</button>
            </div>
          ))}
        </div>
      </div>

      {/* Модалка редактирования */}
      {editing && (
        <div className="adminshop-overlay">
          <EditProductModal
            product={editing}
            cats={cats}
            onSave={loadProducts}
            onClose={() => setEditing(null)}
          />
        </div>
      )}
    </div>
  );
}
