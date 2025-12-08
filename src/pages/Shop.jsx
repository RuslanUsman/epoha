// src/pages/Shop.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import '../styles/global.css'; // подключаем стили

function ProductCard({ product, categoryTitle, serverStartTime, sale }) {
  const { addItem } = useCart();
  const [priceMode, setPriceMode] = useState('rub');
  const [qty, setQty] = useState(1);
  const [showDesc, setShowDesc] = useState(false);
  const [countdown, setCountdown] = useState('');

  const unitRub = Number(product.price_rub || 0);
  const unitPoints = Number(product.price_points || 0);

  const discountPriceRub = sale ? Math.round(unitRub * (1 - sale.discount_percent / 100)) : unitRub;
  const discountPricePoints = sale ? Math.round(unitPoints * (1 - sale.discount_percent / 100)) : unitPoints;

  const unlockTime = product.always_available
    ? 0
    : new Date(serverStartTime).getTime() + (product.available_after_seconds || 0) * 1000;

  const isAvailable = product.always_available || Date.now() >= unlockTime;

  useEffect(() => {
    if (product.always_available) return;
    const interval = setInterval(() => {
      const diff = unlockTime - Date.now();
      if (diff <= 0) {
        setCountdown('');
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 1000 / 3600);
        const minutes = Math.floor((diff / 1000 % 3600) / 60);
        const seconds = Math.floor(diff / 1000 % 60);
        setCountdown(`${hours}ч ${minutes}м ${seconds}с`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [unlockTime, product.always_available]);

  function addToCart() {
    addItem({
      id: product.id,
      categoryTitle,
      title: product.title,
      description: product.description,
      image_path: product.image_path,
      qty,
      priceMode,
      unitPriceRub: discountPriceRub,
      unitPricePoints: discountPricePoints
    });
  }

  return (
    <div className="shop-card">
      {product.image_path && (
        <img src={product.image_path} alt={product.title} className="shop-image" />
      )}
      <h3 className="shop-title">{product.title}</h3>

      <button onClick={() => setShowDesc(s => !s)} className="shop-button toggle">
        {showDesc ? 'Скрыть подробности' : 'Подробности'}
      </button>
      {showDesc && (
        <p className="shop-description">{product.description || 'Нет описания'}</p>
      )}

      <div className="shop-prices">
        {sale ? (
          <>
            <p className="shop-sale">🔥 Скидка {sale.discount_percent}%</p>
            <p><s>{unitRub} руб.</s> → {discountPriceRub} руб.</p>
            <p><s>{unitPoints} баллов</s> → {discountPricePoints} баллов</p>
          </>
        ) : (
          <p>Цена: {unitRub} руб. | {unitPoints} баллов</p>
        )}
      </div>

      <div className="shop-price-modes">
        <label>
          <input
            type="radio"
            name={`price-${product.id}`}
            value="rub"
            checked={priceMode === 'rub'}
            onChange={() => setPriceMode('rub')}
          /> Цена: {discountPriceRub} руб.
        </label>
        <label>
          <input
            type="radio"
            name={`price-${product.id}`}
            value="points"
            checked={priceMode === 'points'}
            onChange={() => setPriceMode('points')}
          /> Цена: {discountPricePoints} баллов
        </label>
      </div>

      {isAvailable ? (
        <button onClick={addToCart} className="shop-button add">
          Добавить в корзину
        </button>
      ) : (
        <p className="shop-unavailable">
          Доступно через: {countdown}
        </p>
      )}
    </div>
  );
}

export default function Shop() {
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [serverStartTime, setServerStartTime] = useState(null);
  const [sale, setSale] = useState(null);

  useEffect(() => {
    async function loadCats() {
      const { data } = await supabase
        .from('product_categories')
        .select('id, title, slug, is_active')
        .eq('is_active', true)
        .order('title', { ascending: true });
      setCategories(data || []);
      if (data?.length) setActiveCat(data[0].id);
    }
    loadCats();

    async function loadServerSettings() {
      const { data } = await supabase
        .from('server_settings')
        .select('start_time')
        .eq('id', 1)
        .single();
      if (data) setServerStartTime(data.start_time);
    }
    loadServerSettings();

    async function loadSale() {
      const { data } = await supabase
        .from('sale_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (data && new Date(data.end_time) > new Date()) {
        setSale(data);
      }
    }
    loadSale();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      if (!activeCat) return;
      const { data } = await supabase
        .from('products')
        .select('id, category_id, title, description, image_path, price_rub, price_points, is_active, available_after_seconds, always_available')
        .eq('is_active', true)
        .eq('category_id', activeCat)
        .order('created_at', { ascending: false });
      setProducts(data || []);
    }
    loadProducts();
  }, [activeCat]);

  const activeCatTitle = categories.find(c => c.id === activeCat)?.title || '';

  return (
    <div className="shop-container">
      <h1 className="shop-heading">Магазин</h1>

      {sale && (
        <div className="shop-sale-banner">
          <strong>🔥 Глобальная распродажа!</strong> Скидка {sale.discount_percent}% до {new Date(sale.end_time).toLocaleString('ru-RU')}
        </div>
      )}

      <div className="shop-categories">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`shop-cat-button ${activeCat === c.id ? 'active' : ''}`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="shop-empty">Нет товаров в этой категории</p>
      ) : (
        <div className="shop-grid">
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              categoryTitle={activeCatTitle}
              serverStartTime={serverStartTime}
              sale={sale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
