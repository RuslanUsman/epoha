// src/components/ProductCard.jsx
import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, categoryTitle, serverStartTime, sale }) {
  const { addItem } = useCart();
  const [priceMode, setPriceMode] = useState('rub');
  const [qty, setQty] = useState(1);
  const [countdown, setCountdown] = useState('');

  const unitRub = Number(product.price_rub || 0);
  const unitPoints = Number(product.price_points || 0);

  // считаем скидку
  const discountPercent = sale ? Number(sale.discount_percent) : 0;
  const discountPriceRub = discountPercent ? Math.round(unitRub * (1 - discountPercent / 100)) : unitRub;
  const discountPricePoints = discountPercent ? Math.round(unitPoints * (1 - discountPercent / 100)) : unitPoints;

  // вычисляем время разблокировки
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
        const h = Math.floor(diff / 1000 / 3600);
        const m = Math.floor((diff / 1000 % 3600) / 60);
        const s = Math.floor(diff / 1000 % 60);
        setCountdown(`${h}ч ${m}м ${s}с`);
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
      // ⚡️ сохраняем цены со скидкой
      unitPriceRub: discountPriceRub,
      unitPricePoints: discountPricePoints
    });
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      {product.image_path && (
        <img src={product.image_path} alt={product.title} style={{ width: '100%', borderRadius: 6, objectFit: 'cover' }} />
      )}
      <h3>{product.title}</h3>
      <p>{product.description || 'Нет описания'}</p>

      {sale ? (
        <>
          <p style={{ color: 'crimson' }}>🔥 Скидка {sale.discount_percent}%</p>
          <p><s>{unitRub} руб.</s> → {discountPriceRub} руб.</p>
          <p><s>{unitPoints} баллов</s> → {discountPricePoints} баллов</p>
        </>
      ) : (
        <p>Цена: {unitRub} руб. | {unitPoints} баллов</p>
      )}

      <div style={{ marginTop: 8 }}>
        <label>
          <input
            type="radio"
            name={`price-${product.id}`}
            value="rub"
            checked={priceMode === 'rub'}
            onChange={() => setPriceMode('rub')}
          /> {discountPriceRub} руб.
        </label>
        <label style={{ marginLeft: 8 }}>
          <input
            type="radio"
            name={`price-${product.id}`}
            value="points"
            checked={priceMode === 'points'}
            onChange={() => setPriceMode('points')}
          /> {discountPricePoints} баллов
        </label>
      </div>

      {isAvailable ? (
        <button
          onClick={addToCart}
          style={{ marginTop: 10, background: '#28a745', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6 }}
        >
          Добавить в корзину
        </button>
      ) : (
        <p style={{ marginTop: 10, color: '#d9534f' }}>
          Доступно через: {countdown}
        </p>
      )}
    </div>
  );
}
