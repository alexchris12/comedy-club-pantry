export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const order = request.body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return response.status(500).json({
        error: "Telegram environment variables are missing",
      });
    }

    const itemsText = (order.items || [])
      .map((item) => {
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const itemTotal = qty * price;

        return `${qty} x ${item.name} - ₹${itemTotal}`;
      })
      .join("\n");

    const message = `🔔 New Penfry Order

Order ID: ${order.id || "Not found"}

Customer: ${order.customer?.name || "Not added"}
Contact: ${order.customer?.phone || "Not added"}

Items:
${itemsText || "No items found"}

Total: ₹${order.total || 0}
Payment: ${order.paymentStatus || "Awaiting payment"}
Status: ${order.status || "New"}

${order.customer?.transactionId ? `UPI Ref: ${order.customer.transactionId}` : "UPI Ref: Not added yet"}
${order.customer?.note ? `Note: ${order.customer.note}` : ""}`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      }
    );

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error("Telegram error:", errorText);

      return response.status(500).json({
        error: "Telegram message failed",
        details: errorText,
      });
    }

    return response.status(200).json({
      success: true,
      message: "Telegram notification sent",
    });
  } catch (error) {
    console.error("Server error:", error);

    return response.status(500).json({
      error: "Server error",
    });
  }
}