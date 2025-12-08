// src/pages/Cart.jsx
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css'; // подключаем стили

export default function Cart({ session }) {
  const { items, updateQty, removeItem, clearCart } = useCart();
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    async function checkVip() {
      if (!session) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('is_vip')
        .eq('id', session.user.id)
        .single();

      if (!error) setIsVip(Boolean(data?.is_vip));
    }
    checkVip();
  }, [session]);

  const totals = items.reduce(
    (acc, i) => {
      const lineRub = i.priceMode === 'rub' ? i.unitPriceRub * i.qty : 0;
      const linePts = i.priceMode === 'points' ? i.unitPricePoints * i.qty : 0;
      acc.rub += lineRub;
      acc.points += linePts;
      return acc;
    },
    { rub: 0, points: 0 }
  );

  const potentialDiscountRub = totals.rub * 0.15;
  const potentialDiscountPoints = Math.floor(totals.points * 0.15);

  async function placeOrder() {
    if (!session || items.length === 0) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, telegram_username')
      .eq('id', session.user.id)
      .single();

    const { data: order } = await supabase
      .from('orders')
      .insert({
        user_id: session.user.id,
        status: 'pending',
        customer_name: profile?.username || session.user.email,
        customer_tg: profile?.telegram_username || profile?.username || null
      })
      .select()
      .single();

    const orderItems = items.map(i => {
      let finalRub = i.unitPriceRub;
      let finalPoints = i.unitPricePoints;
      if (isVip) {
        finalRub = Math.round(finalRub * 0.85);
        finalPoints = Math.round(finalPoints * 0.85);
      }
      return {
        order_id: order.id,
        product_id: i.id,
        qty: i.qty,
        price_mode: i.priceMode,
        unit_price_rub: finalRub,
        unit_price_points: finalPoints
      };
    });

    await supabase.from('order_items').insert(orderItems);
    clearCart();
    alert('Заказ оформлен!');
    window.location.href = '/shop';
  }

  return (
    <div className="cart-container">
      <h1 className="cart-title">Корзина</h1>

      {items.length === 0 ? (
        <p className="cart-empty">Корзина пуста</p>
      ) : (
        <div className="cart-list">
          {items.map(i => (
            <div key={`${i.id}-${i.priceMode}`} className="cart-item">
              {i.image_path && (
                <img src={i.image_path} alt={i.title} className="cart-image" />
              )}
              <h3>{i.title}</h3>
              <p>{i.description}</p>
              <p>{i.priceMode === 'rub' ? `${i.unitPriceRub} руб.` : `${i.unitPricePoints} баллов`}</p>
              <div className="cart-qty">
                <button onClick={() => updateQty(i.id, i.priceMode, i.qty - 1)}>-</button>
                <span>{i.qty}</span>
                <button onClick={() => updateQty(i.id, i.priceMode, i.qty + 1)}>+</button>
              </div>
              <button onClick={() => removeItem(i.id, i.priceMode)} className="cart-remove">
                Удалить
              </button>
            </div>
          ))}

          <div className="cart-summary">
            <p><strong>Итого в рублях:</strong> {totals.rub.toFixed(2)}</p>
            <p><strong>Итого в баллах:</strong> {totals.points}</p>

            {isVip ? (
              <div className="cart-vip">
                <p><strong>Скидка VIP 15%:</strong> −{potentialDiscountRub.toFixed(2)} руб., −{potentialDiscountPoints} баллов</p>
                <p><strong>Итого со скидкой:</strong> {(totals.rub - potentialDiscountRub).toFixed(2)} руб., {totals.points - potentialDiscountPoints} баллов</p>
              </div>
            ) : (
              <div className="cart-nonvip">
                <p>Если бы у вас была VIP‑подписка, вы бы сэкономили {potentialDiscountRub.toFixed(2)} руб. и {potentialDiscountPoints} баллов.</p>
              </div>
            )}
          </div>

          <button onClick={placeOrder} className="cart-order">
            Оформить заказ
          </button>
        </div>
      )}
    </div>
  );
}
