// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

// Pages
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Friends from './pages/Friends';
import FriendsList from './pages/FriendsList';
import Requests from './pages/Requests';
import Chat from './pages/Chat';
import Dialogs from './pages/Dialogs';
import Admin from './pages/Admin';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import AdminShop from './pages/AdminShop';
import Orders from './pages/Orders';
import ServerRules from './pages/ServerRules'; // ✅ страница правил сервера
import EditRules from './pages/EditRules';     // ✅ страница редактирования правил

// Layout
import Header from './components/Header';
import Footer from './components/Footer';

// Context
import { CartProvider } from './context/CartContext';

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  if (checking) {
    return <div style={{ padding: 24 }}>Загрузка...</div>;
  }

  return (
    <CartProvider>
      <BrowserRouter>
        <Header session={session} />
        <main style={{ minHeight: 'calc(100vh - 120px)', padding: '16px' }}>
          <Routes>
            {/* Главная перенаправляет на профиль или вход */}
            <Route
              path="/"
              element={<Navigate to={session ? "/profile" : "/login"} replace />}
            />

            {/* Регистрация и вход */}
            <Route
              path="/register"
              element={session ? <Navigate to="/profile" replace /> : <Register />}
            />
            <Route
              path="/login"
              element={session ? <Navigate to="/profile" replace /> : <Login />}
            />

            {/* Профиль текущего пользователя */}
            <Route
              path="/profile"
              element={session ? <Profile /> : <Navigate to="/login" replace />}
            />

            {/* Страница правил сервера */}
            <Route
              path="/server-rules"
              element={session ? <ServerRules /> : <Navigate to="/login" replace />}
            />

            {/* Страница редактирования правил (только для админа) */}
            <Route
              path="/edit-rules"
              element={session ? <EditRules /> : <Navigate to="/login" replace />}
            />

            {/* Профиль выбранного пользователя */}
            <Route
              path="/profile/:id"
              element={session ? <UserProfile /> : <Navigate to="/login" replace />}
            />

            {/* Поиск друзей */}
            <Route
              path="/friends"
              element={session ? <Friends /> : <Navigate to="/login" replace />}
            />

            {/* Список друзей */}
            <Route
              path="/friends-list"
              element={session ? <FriendsList /> : <Navigate to="/login" replace />}
            />

            {/* Заявки в друзья */}
            <Route
              path="/requests"
              element={session ? <Requests /> : <Navigate to="/login" replace />}
            />

            {/* Чат с пользователем */}
            <Route
              path="/chat/:partnerId"
              element={session ? <Chat /> : <Navigate to="/login" replace />}
            />

            {/* Диалоги */}
            <Route
              path="/dialogs"
              element={session ? <Dialogs /> : <Navigate to="/login" replace />}
            />

            {/* Админ панель */}
            <Route
              path="/admin"
              element={session ? <Admin /> : <Navigate to="/login" replace />}
            />

            {/* Магазин */}
            <Route
              path="/shop"
              element={session ? <Shop /> : <Navigate to="/login" replace />}
            />

            {/* Корзина */}
            <Route
              path="/cart"
              element={session ? <Cart session={session} /> : <Navigate to="/login" replace />}
            />

            {/* Управление магазином */}
            <Route
              path="/admin-shop"
              element={session ? <AdminShop /> : <Navigate to="/login" replace />}
            />

            {/* Заказы */}
            <Route
              path="/admin-orders"
              element={session ? <Orders /> : <Navigate to="/login" replace />}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </CartProvider>
  );
}
