// src/pages/Orders.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css'; // подключаем стили

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [clickedButtons, setClickedButtons] = useState({});

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        created_at,
        profiles(username),
        order_items(
          id,
          qty,
          price_mode,
          unit_price_rub,
          unit_price_points,
          products(title, description, category_id, product_categories(title))
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function markButtonClicked(orderId, button) {
    setClickedButtons(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [button]: true
      }
    }));
  }

  async function updateStatus(orderId, newStatus, button) {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    markButtonClicked(orderId, button);
    loadOrders();
  }

  async function deleteOrder(orderId) {
    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('orders').delete().eq('id', orderId);
    loadOrders();
  }

  async function completeOrder(order) {
    await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id);

    const totalRub = order.order_items.reduce(
      (sum, it) => sum + (it.price_mode === 'rub' ? it.unit_price_rub * it.qty : 0),
      0
    );
    const totalPoints = order.order_items.reduce(
      (sum, it) => sum + (it.price_mode === 'points' ? it.unit_price_points * it.qty : 0),
      0
    );

    if (totalRub > 0) {
      const bonusPoints = Math.floor(totalRub * 0.2);
      await supabase.rpc('add_points', { user_id: order.user_id, amount: bonusPoints });
    }

    if (totalPoints > 0) {
      await supabase.rpc('subtract_points', { user_id: order.user_id, amount: totalPoints });
    }

    markButtonClicked(order.id, 'completed');
    loadOrders();
  }

  const statusMap = {
    pending: 'Ожидает',
    processing: 'В обработке',
    completed: 'Выполнен',
    cancelled: 'Отменён',
    failed: 'Ошибка'
  };

  return (
    <div className="orders-container">
      <h2 className="orders-title">Заказы</h2>

      {orders.length === 0 ? (
        <p className="orders-empty">Заказов пока нет</p>
      ) : (
        orders.map(order => {
          const totalRub = order.order_items.reduce(
            (sum, it) => sum + (it.price_mode === 'rub' ? it.unit_price_rub * it.qty : 0),
            0
          );
          const totalPoints = order.order_items.reduce(
            (sum, it) => sum + (it.price_mode === 'points' ? it.unit_price_points * it.qty : 0),
            0
          );

          return (
            <div key={order.id} className="order-card">
              <h3>Заказ #{order.id}</h3>
              <p><strong>Пользователь:</strong> {order.profiles?.username || order.user_id}</p>
              <p><strong>Дата:</strong> {new Date(order.created_at).toLocaleString()}</p>
              <p><strong>Статус:</strong> {statusMap[order.status] || order.status}</p>

              <div className="order-actions">
                <button
                  onClick={() => updateStatus(order.id, 'processing', 'processing')}
                  disabled={clickedButtons[order.id]?.processing}
                  className="order-button"
                >
                  В обработке
                </button>
                <button
                  onClick={() => completeOrder(order)}
                  disabled={clickedButtons[order.id]?.completed}
                  className="order-button success"
                >
                  Выполнен
                </button>
                <button
                  onClick={() => updateStatus(order.id, 'cancelled', 'cancelled')}
                  disabled={clickedButtons[order.id]?.cancelled}
                  className="order-button danger"
                >
                  Отменён
                </button>
              </div>

              <h4 className="order-subtitle">Товары:</h4>
              <ul className="order-items">
                {order.order_items.map(it => (
                  <li key={it.id} className="order-item">
                    <strong>{it.products?.title}</strong>
                    <div className="order-desc">{it.products?.description || 'Нет описания'}</div>
                    <div className="order-cat">Раздел: {it.products?.product_categories?.title || '—'}</div>
                    <div>
                      Кол-во: {it.qty} | Цена:{" "}
                      {it.price_mode === 'rub'
                        ? `${it.unit_price_rub} руб.`
                        : `${it.unit_price_points} баллов`}
                    </div>
                  </li>
                ))}
              </ul>

              <p className="order-total">
                <strong>Итого:</strong> {totalRub.toFixed(2)} руб. и {totalPoints} баллов
              </p>

              <button
                onClick={() => deleteOrder(order.id)}
                className="order-button danger"
              >
                Удалить заказ
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
