// supabase/functions/notify-new-order/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN");
const ADMIN_CHAT_ID = Deno.env.get("ADMIN_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Клиент Supabase для запросов внутри функции
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

serve(async (req) => {
  try {
    const payload = await req.json();
    const order = payload.record;

    // Загружаем товары для этого заказа
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("qty, price_mode, unit_price_rub, unit_price_points, products(title, description)")
      .eq("order_id", order.id);

    if (itemsError) {
      console.error("Ошибка загрузки товаров:", itemsError.message);
    }

    // Формируем список товаров
    let itemsText = "—";
    if (items && items.length > 0) {
      itemsText = items
        .map((i) => {
          const price =
            i.price_mode === "rub"
              ? i.unit_price_rub * i.qty + " ₽"
              : i.unit_price_points * i.qty + " баллов";
          return `- ${i.products?.title || "Товар"} x${i.qty} = ${price}\n  📖 ${i.products?.description || ""}`;
        })
        .join("\n");
    }

    // Считаем итоговую сумму
    const totalRub = items?.reduce(
      (sum, i) => sum + (i.price_mode === "rub" ? i.unit_price_rub * i.qty : 0),
      0
    ) || 0;

    const totalPoints = items?.reduce(
      (sum, i) => sum + (i.price_mode === "points" ? i.unit_price_points * i.qty : 0),
      0
    ) || 0;

    // Формируем сообщение
    const message = `
🛒 Новый заказ #${order.id}
👤 Клиент: ${order.customer_name}
💬 TG: ${order.customer_tg || "—"}
📦 Товары:
${itemsText}
💰 Сумма: ${totalRub} ₽ и ${totalPoints} баллов
📅 Дата: ${new Date(order.created_at).toLocaleString("ru-RU")}
`;

    // Inline‑кнопка "Связаться с заказчиком"
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "Связаться с заказчиком", url: `https://t.me/${order.customer_tg}` }
        ]
      ]
    };

    // Отправляем сообщение в Telegram
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      }),
    });

    const data = await res.json();
    console.log("Telegram response:", data);

    return new Response("Notification sent", { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response("Error sending notification", { status: 500 });
  }
});
