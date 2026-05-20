import { useEffect, useMemo, useState } from "react";
import "./App.css";

const UPI_ID = "9662826847@pthdfc";
const PAYEE_NAME = "Penfry";

const menuItems = [
  {
    id: "veg-burger",
    name: "Classic Veg Burger",
    category: "Burgers",
    price: 149,
    desc: "Crispy patty, cheese, lettuce and house sauce.",
  },
  {
    id: "chicken-burger",
    name: "Chicken Club Burger",
    category: "Burgers",
    price: 199,
    desc: "Juicy chicken patty with smoky mayo.",
  },
  {
    id: "peri-fries",
    name: "Peri Peri Fries",
    category: "Snacks",
    price: 99,
    desc: "Crispy fries tossed in peri peri spice.",
  },
  {
    id: "nachos",
    name: "Loaded Nachos",
    category: "Snacks",
    price: 179,
    desc: "Nachos with salsa, cheese sauce and jalapeños.",
  },
  {
    id: "sandwich",
    name: "Grilled Cheese Sandwich",
    category: "Sandwiches",
    price: 129,
    desc: "Golden grilled bread with melted cheese.",
  },
  {
    id: "cold-coffee",
    name: "Cold Coffee",
    category: "Beverages",
    price: 129,
    desc: "Chilled coffee, creamy and smooth.",
  },
  {
    id: "iced-tea",
    name: "Lemon Iced Tea",
    category: "Beverages",
    price: 99,
    desc: "Refreshing lemon iced tea.",
  },
  {
    id: "laugh-combo",
    name: "Laugh Combo",
    category: "Combos",
    price: 299,
    desc: "Veg burger + fries + iced tea.",
  },
];

function formatPrice(amount) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function createUpiLink(amount, orderId) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Pantry Order ${orderId}`,
  });

  return `upi://pay?${params.toString()}`;
}

function createQrUrl(upiLink) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    upiLink
  )}`;
}

export default function App() {
  const [view, setView] = useState("menu");
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [customer, setCustomer] = useState({
    name: "",
    seat: "",
    note: "",
    transactionId: "",
  });
  const [orders, setOrders] = useState([]);
  const [latestOrder, setLatestOrder] = useState(null);

  useEffect(() => {
    const savedOrders = localStorage.getItem("pantryOrders");
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pantryOrders", JSON.stringify(orders));
  }, [orders]);

  const categories = ["All", ...new Set(menuItems.map((item) => item.category))];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = menuItems.find((menuItem) => menuItem.id === id);
        return item ? { ...item, qty } : null;
      })
      .filter(Boolean);
  }, [cart]);

  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  function addItem(id) {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  }

  function removeItem(id) {
    setCart((prev) => {
      const updated = { ...prev };

      if (!updated[id]) return updated;

      updated[id] -= 1;

      if (updated[id] <= 0) {
        delete updated[id];
      }

      return updated;
    });
  }

  function placeOrder() {
    if (!customer.name.trim() || !customer.seat.trim() || cartItems.length === 0) {
      alert("Please enter your name, seat number and add items.");
      return;
    }

    const orderId = `CCP-${String(Date.now()).slice(-5)}`;
    const upiLink = createUpiLink(total, orderId);

    const order = {
      id: orderId,
      items: cartItems,
      total,
      customer,
      status: "New",
      paymentStatus: "Awaiting payment",
      upiLink,
      qrUrl: createQrUrl(upiLink),
      time: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setOrders((prev) => [order, ...prev]);
    setLatestOrder(order);
    setCart({});
    setView("payment");
  }

  function markPaid() {
    if (!latestOrder) return;

    const updatedOrder = {
      ...latestOrder,
      customer,
      paymentStatus: customer.transactionId
        ? "Paid - verify UPI ref"
        : "Paid - verify manually",
    };

    setLatestOrder(updatedOrder);

    setOrders((prev) =>
      prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );

    alert("Payment marked. Pantry will verify manually.");
  }

  function updateStatus(orderId, newStatus) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  }

  function clearOrders() {
    const confirmClear = window.confirm("Clear all orders?");
    if (confirmClear) {
      setOrders([]);
      localStorage.removeItem("pantryOrders");
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Comedy Club</p>
          <h1>Pantry</h1>
        </div>

        <button
          className="adminBtn"
          onClick={() => setView(view === "admin" ? "menu" : "admin")}
        >
          {view === "admin" ? "Menu" : "Admin"}
        </button>
      </header>

      {view === "menu" && (
        <main className="page">
          <section className="hero">
            <p>Order from your seat</p>
            <h2>Fast bites before the next punchline.</h2>
            <span>Add items, enter your name and seat number, then pay using UPI.</span>
          </section>

          <input
            className="search"
            placeholder="Search burgers, fries, coffee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="categories">
            {categories.map((cat) => (
              <button
                key={cat}
                className={category === cat ? "activeCat" : ""}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="menuList">
            {filteredItems.map((item) => {
              const qty = cart[item.id] || 0;

              return (
                <div className="menuCard" key={item.id}>
                  <div className="foodIcon">
                    {item.category === "Beverages"
                      ? "🥤"
                      : item.category === "Burgers"
                      ? "🍔"
                      : item.category === "Combos"
                      ? "🍱"
                      : "🍟"}
                  </div>

                  <div className="foodInfo">
                    <div className="foodTop">
                      <h3>{item.name}</h3>
                      <strong>{formatPrice(item.price)}</strong>
                    </div>

                    <p>{item.desc}</p>

                    <div className="foodBottom">
                      <span>{item.category}</span>

                      {qty === 0 ? (
                        <button className="addBtn" onClick={() => addItem(item.id)}>
                          Add
                        </button>
                      ) : (
                        <div className="qtyBox">
                          <button onClick={() => removeItem(item.id)}>-</button>
                          <b>{qty}</b>
                          <button onClick={() => addItem(item.id)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {view === "checkout" && (
        <main className="page">
          <h2 className="pageTitle">Checkout</h2>
          <p className="muted">Confirm your order and add your seat details.</p>

          <div className="checkoutItems">
            {cartItems.map((item) => (
              <div className="checkoutItem" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {formatPrice(item.price)} × {item.qty}
                  </p>
                </div>
                <strong>{formatPrice(item.price * item.qty)}</strong>
              </div>
            ))}
          </div>

          <div className="formBox">
            <label>
              Name
              <input
                placeholder="Enter your name"
                value={customer.name}
                onChange={(e) =>
                  setCustomer({ ...customer, name: e.target.value })
                }
              />
            </label>

            <label>
              Seat Number
              <input
                placeholder="Example: B12"
                value={customer.seat}
                onChange={(e) =>
                  setCustomer({ ...customer, seat: e.target.value })
                }
              />
            </label>

            <label>
              Special Instructions
              <textarea
                placeholder="No onion, extra spicy, etc."
                value={customer.note}
                onChange={(e) =>
                  setCustomer({ ...customer, note: e.target.value })
                }
              />
            </label>
          </div>

          <div className="totalBox">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          <button className="primaryBtn" onClick={placeOrder}>
            Place Order & Pay
          </button>

          <button className="secondaryBtn" onClick={() => setView("menu")}>
            Back to Menu
          </button>
        </main>
      )}

      {view === "payment" && latestOrder && (
        <main className="page">
          <section className="successBox">
            <div className="check">✓</div>
            <h2>Order Placed</h2>
            <p>
              {latestOrder.id} • Seat {latestOrder.customer.seat}
            </p>

            <div className="payAmount">
              <span>Amount to pay</span>
              <strong>{formatPrice(latestOrder.total)}</strong>
            </div>
          </section>

          <section className="paymentBox">
            <h2>Pay with UPI</h2>
            <p>
              Scan this QR or tap the button. The amount and order ID are
              auto-filled.
            </p>

            <img src={latestOrder.qrUrl} alt="UPI QR Code" className="qr" />

            <a className="upiBtn" href={latestOrder.upiLink}>
              Open UPI App
            </a>

            <p className="upiText">UPI ID: {UPI_ID}</p>
          </section>

          <section className="verifyBox">
            <h3>After payment</h3>
            <p>
              Enter your UPI transaction/reference ID. Pantry staff will verify it
              manually.
            </p>

            <input
              placeholder="UPI reference / transaction ID"
              value={customer.transactionId}
              onChange={(e) =>
                setCustomer({ ...customer, transactionId: e.target.value })
              }
            />

            <button className="primaryBtn" onClick={markPaid}>
              I Have Paid
            </button>
          </section>

          <button className="secondaryBtn" onClick={() => setView("menu")}>
            Back to Menu
          </button>
        </main>
      )}

      {view === "admin" && (
        <main className="page">
          <div className="adminHeader">
            <div>
              <p className="eyebrow">Staff Dashboard</p>
              <h2>Orders</h2>
            </div>

            <button className="clearBtn" onClick={clearOrders}>
              Clear
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="emptyBox">
              <h3>No orders yet</h3>
              <p>Orders will appear here after customers place them.</p>
            </div>
          ) : (
            <div className="ordersList">
              {orders.map((order) => (
                <div className="orderCard" key={order.id}>
                  <div className="orderTop">
                    <div>
                      <small>{order.time}</small>
                      <h3>{order.id}</h3>
                      <p>
                        {order.customer.name} • Seat {order.customer.seat}
                      </p>
                    </div>

                    <span className={`status ${order.status}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="orderItems">
                    {order.items.map((item) => (
                      <div key={item.id}>
                        <span>
                          {item.qty} × {item.name}
                        </span>
                        <strong>{formatPrice(item.price * item.qty)}</strong>
                      </div>
                    ))}
                  </div>

                  {order.customer.note && (
                    <p className="note">Note: {order.customer.note}</p>
                  )}

                  <div className="paymentStatus">
                    <div>
                      <small>Payment</small>
                      <p>{order.paymentStatus}</p>
                      {order.customer.transactionId && (
                        <small>Ref: {order.customer.transactionId}</small>
                      )}
                    </div>

                    <strong>{formatPrice(order.total)}</strong>
                  </div>

                  <div className="statusButtons">
                    <button onClick={() => updateStatus(order.id, "Preparing")}>
                      Preparing
                    </button>
                    <button onClick={() => updateStatus(order.id, "Ready")}>
                      Ready
                    </button>
                    <button onClick={() => updateStatus(order.id, "Delivered")}>
                      Delivered
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {view === "menu" && itemCount > 0 && (
        <div className="cartBar">
          <button onClick={() => setView("checkout")}>
            View Cart • {itemCount} items • {formatPrice(total)}
          </button>
        </div>
      )}
    </div>
  );
}