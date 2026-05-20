import penfryLogo from "./assets/penfry-logo.png";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import "./App.css";

const UPI_ID = "shashisuryavanshi7647-2@oksbi";
const PAYEE_NAME = "Penfry";

const DEFAULT_MENU_ITEMS = [
  {
    id: "saste-nashe",
    name: "Saste Nashe",
    category: "Chai Pani",
    price: 25,
    desc: "Nothing but chai",
  },
  {
    id: "chai-chhod-di-hai",
    name: "Chai Chhod di hai",
    category: "Chai Pani",
    price: 49,
    desc: "Hot Coffee",
  },
  {
    id: "ameero-ki-chhaach",
    name: "Ameero Ki Chhaach",
    category: "Chai Pani",
    price: 99,
    desc: "Cold Coffee",
  },
  {
    id: "kacha-nimbuda",
    name: "Kacha Nimbuda",
    category: "Chai Pani",
    price: 119,
    desc: "Virgin Mojito",
  },
  {
    id: "aam-aadmi-drink",
    name: "Aam Aadmi Drink",
    category: "Chai Pani",
    price: 129,
    desc: "Mango Mojito",
  },
  {
    id: "laal-pari-mocktail",
    name: "Laal-Pari Mocktail",
    category: "Chai Pani",
    price: 129,
    desc: "Watermelon Mojito",
  },
  {
    id: "desh-ka-namak-fries",
    name: "Desh Ka Namak Fries",
    category: "Munchies",
    price: 99,
    desc: "Salted Fries",
  },
  {
    id: "masaledaar-fries",
    name: "Masaledaar Fries",
    category: "Munchies",
    price: 119,
    desc: "Peri Peri Fries",
  },
  {
    id: "shakahari-fries",
    name: "Shakahari Fries",
    category: "Munchies",
    price: 149,
    desc: "Paneer loaded Fries",
  },
  {
    id: "mansahari-fries",
    name: "Mansahari Fries",
    category: "Munchies",
    price: 169,
    desc: "Chicken loaded Fries",
  },
  {
    id: "chakna-pro-max",
    name: "Chakna Pro Max",
    category: "Munchies",
    price: 149,
    desc: "Loaded Nachos",
  },
  {
    id: "shakahari-sandwich",
    name: "Shakahari Sandwich",
    category: "Munchies",
    price: 149,
    desc: "Paneer Sandwich",
  },
  {
    id: "murgi-chor-sandwich",
    name: "Murgi Chor Sandwich",
    category: "Munchies",
    price: 169,
    desc: "Chicken Sandwich",
  },
  {
    id: "videshi-momo",
    name: "Videshi Momo",
    category: "Munchies",
    price: 119,
    desc: "Veg. Bao",
  },
  {
    id: "indian-brownie",
    name: "Indian",
    category: "Sugar Rush",
    price: 80,
    desc: "Brownie",
  },
  {
    id: "russian-vanilla",
    name: "Russian",
    category: "Sugar Rush",
    price: 40,
    desc: "Vanilla",
  },
];

function formatPrice(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function createUpiLink(amount, orderId) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Penfry Order ${orderId}`,
  });

  return `upi://pay?${params.toString()}`;
}

function createQrUrl(upiLink) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    upiLink
  )}`;
}

function getItemIcon(item) {
  if (item.category === "Chai Pani") {
    if (item.desc.toLowerCase().includes("coffee")) return "☕";
    if (item.desc.toLowerCase().includes("mojito")) return "🍹";
    return "🫖";
  }

  if (item.category === "Sugar Rush") {
    if (item.desc.toLowerCase().includes("vanilla")) return "🍦";
    return "🍫";
  }

  if (item.name.toLowerCase().includes("sandwich")) return "🥪";
  if (item.name.toLowerCase().includes("momo")) return "🥟";
  if (item.name.toLowerCase().includes("nachos")) return "🌮";

  return "🍟";
}

export default function App() {
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);

  const [view, setView] = useState(
    window.location.pathname === "/admin" ||
      window.location.search.includes("admin=1")
      ? "admin"
      : "menu"
  );

  const [cart, setCart] = useState({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    note: "",
    transactionId: "",
  });

  const [orders, setOrders] = useState([]);
  const [itemAvailability, setItemAvailability] = useState({});
  const [latestOrder, setLatestOrder] = useState(null);
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [adminFilter, setAdminFilter] = useState("active");
  const [adminDateFilter, setAdminDateFilter] = useState("today");

  const isAdminPage =
    window.location.pathname === "/admin" ||
    window.location.search.includes("admin=1");

  const ADMIN_PIN = "6969";
  const [pinInput, setPinInput] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(
    sessionStorage.getItem("penfryAdminUnlocked") === "true"
  );

  const playNewOrderSound = () => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.35,
      audioContext.currentTime + 0.02
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.35
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.36);
  };

  useEffect(() => {
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const liveOrders = snapshot.docs.map((document) => ({
        firestoreId: document.id,
        ...document.data(),
      }));

      setOrders((previousOrders) => {
        const previousIds = previousOrders.map((order) => order.id);
        const hasNewOrder = liveOrders.some(
          (order) => !previousIds.includes(order.id)
        );

        if (
          isAdminPage &&
          isAdminUnlocked &&
          hasLoadedOrders &&
          hasNewOrder
        ) {
          if (soundEnabled) {
            playNewOrderSound();
          }

          setNewOrderAlert(true);

          setTimeout(() => {
            setNewOrderAlert(false);
          }, 4000);
        }

        return liveOrders;
      });

      setHasLoadedOrders(true);
    });

    return () => unsubscribe();
  }, [isAdminPage, isAdminUnlocked, hasLoadedOrders, soundEnabled]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "itemAvailability"),
      (snapshot) => {
        const availabilityData = {};

        snapshot.docs.forEach((document) => {
          availabilityData[document.id] = document.data().available;
        });

        setItemAvailability(availabilityData);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "menuItems"), (snapshot) => {
      const firebaseMenuData = {};

      snapshot.docs.forEach((document) => {
        firebaseMenuData[document.id] = document.data();
      });

      const mergedMenuItems = DEFAULT_MENU_ITEMS.map((item) => {
        const firebaseItem = firebaseMenuData[item.id];

        if (!firebaseItem) return item;

        return {
          ...item,
          ...firebaseItem,
          id: item.id,
          category: firebaseItem.category || item.category,
          price: Number(firebaseItem.price ?? item.price),
        };
      });

      setMenuItems(mergedMenuItems);
    });

    return () => unsubscribe();
  }, []);

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

  const todayDate = new Date().toLocaleDateString("en-IN");

  const getOrderDate = (order) => {
    if (order.createdAt?.toDate) {
      return order.createdAt.toDate().toLocaleDateString("en-IN");
    }

    if (order.createdAt) {
      return new Date(order.createdAt).toLocaleDateString("en-IN");
    }

    return todayDate;
  };

  const dateFilteredOrders =
    adminDateFilter === "today"
      ? orders.filter((order) => getOrderDate(order) === todayDate)
      : orders;

  const activeOrders = dateFilteredOrders.filter((order) =>
    ["New", "Preparing", "Ready"].includes(order.status)
  );

  const completedOrders = dateFilteredOrders.filter((order) =>
    ["Delivered", "Cancelled"].includes(order.status)
  );

  const visibleOrders =
    adminFilter === "active" ? activeOrders : completedOrders;

  const verifiedOrders = dateFilteredOrders.filter(
    (order) => order.paymentStatus === "Payment verified"
  );

  const verifiedSalesTotal = verifiedOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const totalOrderValue = dateFilteredOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  function addItem(id) {
    if (!isItemAvailable(id)) return;

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

  function isItemAvailable(itemId) {
    return itemAvailability[itemId] !== false;
  }

  async function placeOrder() {
    if (!customer.name.trim() || !customer.phone.trim() || cartItems.length === 0) {
      alert("Please enter your name, contact number and add items.");
      return;
    }

    const unavailableCartItem = cartItems.find(
      (item) => !isItemAvailable(item.id)
    );

    if (unavailableCartItem) {
      alert(`${unavailableCartItem.name} is sold out. Please remove it from cart.`);
      return;
    }

    const orderId = `PF-${String(Date.now()).slice(-5)}`;
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
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "orders"), order);

      try {
        await fetch("/api/send-telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(order),
        });
      } catch (telegramError) {
        console.error("Telegram notification failed:", telegramError);
      }

      setLatestOrder({
        ...order,
        createdAt: new Date().toISOString(),
      });

      setCart({});
      setView("payment");
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Could not place order. Please check Firebase setup.");
    }
  }

  async function markPaid() {
    if (!latestOrder) return;

    const selectedOrder = orders.find((order) => order.id === latestOrder.id);

    if (!selectedOrder?.firestoreId) {
      alert(
        "Order saved, but payment status could not update. Please tell pantry your order ID."
      );
      return;
    }

    const updatedPaymentStatus = customer.transactionId
      ? "Paid - verify UPI ref"
      : "Paid - verify manually";

    try {
      await updateDoc(doc(db, "orders", selectedOrder.firestoreId), {
        customer: {
          ...selectedOrder.customer,
          transactionId: customer.transactionId,
        },
        paymentStatus: updatedPaymentStatus,
      });

      setLatestOrder({
        ...latestOrder,
        customer: {
          ...latestOrder.customer,
          transactionId: customer.transactionId,
        },
        paymentStatus: updatedPaymentStatus,
      });

      alert("Payment marked. Pantry will verify manually.");
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Could not update payment status.");
    }
  }

  async function updateStatus(orderId, newStatus) {
    const selectedOrder = orders.find((order) => order.id === orderId);

    if (!selectedOrder?.firestoreId) return;

    try {
      await updateDoc(doc(db, "orders", selectedOrder.firestoreId), {
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Could not update order status.");
    }
  }

  async function verifyPayment(orderId) {
    const selectedOrder = orders.find((order) => order.id === orderId);

    if (!selectedOrder?.firestoreId) return;

    try {
      await updateDoc(doc(db, "orders", selectedOrder.firestoreId), {
        paymentStatus: "Payment verified",
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Could not verify payment.");
    }
  }

  async function toggleItemAvailability(itemId) {
    const currentAvailability = isItemAvailable(itemId);
    const nextAvailability = !currentAvailability;

    try {
      await setDoc(doc(db, "itemAvailability", itemId), {
        available: nextAvailability,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating item availability:", error);
      alert("Could not update item availability.");
    }
  }

  async function editMenuItem(item) {
    const newName = window.prompt("Edit item name:", item.name);
    if (newName === null) return;

    const newDesc = window.prompt("Edit item description:", item.desc);
    if (newDesc === null) return;

    const newPriceInput = window.prompt("Edit item price:", String(item.price));
    if (newPriceInput === null) return;

    const newPrice = Number(newPriceInput);

    if (!newName.trim()) {
      alert("Item name cannot be empty.");
      return;
    }

    if (!newDesc.trim()) {
      alert("Description cannot be empty.");
      return;
    }

    if (Number.isNaN(newPrice) || newPrice < 0) {
      alert("Please enter a valid price.");
      return;
    }

    try {
      await setDoc(
        doc(db, "menuItems", item.id),
        {
          name: newName.trim(),
          desc: newDesc.trim(),
          price: newPrice,
          category: item.category,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Menu item updated.");
    } catch (error) {
      console.error("Error updating menu item:", error);
      alert("Could not update menu item.");
    }
  }

  function downloadOrdersCsv() {
    if (visibleOrders.length === 0) {
      alert("No orders to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Time",
      "Customer Name",
      "Phone",
      "Items",
      "Total",
      "Payment Status",
      "Order Status",
    ];

    const rows = visibleOrders.map((order) => {
      const itemsText = (order.items || [])
        .map((item) => `${item.qty} x ${item.name}`)
        .join(" | ");

      return [
        order.id || "",
        order.time || "",
        order.customer?.name || "",
        order.customer?.phone || "",
        itemsText,
        order.total || 0,
        order.paymentStatus || "",
        order.status || "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const safeCell = String(cell).replace(/"/g, '""');
            return `"${safeCell}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `penfry-orders-${adminDateFilter}-${adminFilter}-${today}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  async function clearOrders() {
    const confirmClear = window.confirm("Clear all orders?");
    if (!confirmClear) return;

    try {
      const deletePromises = orders
        .filter((order) => order.firestoreId)
        .map((order) => deleteDoc(doc(db, "orders", order.firestoreId)));

      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error clearing orders:", error);
      alert("Could not clear orders.");
    }
  }

  function unlockAdmin() {
    if (pinInput === ADMIN_PIN) {
      sessionStorage.setItem("penfryAdminUnlocked", "true");
      setIsAdminUnlocked(true);
    } else {
      alert("Wrong PIN");
    }
  }

  function enableSound() {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.3,
      audioContext.currentTime + 0.02
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.25
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.26);

    setSoundEnabled(true);
  }

  if (isAdminPage && !isAdminUnlocked) {
    return (
      <div className="app">
        <main className="page adminLoginPage">
          <div className="adminLoginBox">
            <h1>PENFRY</h1>
            <p>Enter admin PIN to view live orders.</p>

            <input
              type="password"
              inputMode="numeric"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
            />

            <button className="primaryBtn" onClick={unlockAdmin}>
              Unlock Admin
            </button>

            <button
              className="secondaryBtn"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Back to Menu
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brandWrap">
          <img src={penfryLogo} alt="Penfry" className="brandLogo" />
        </div>

        {isAdminPage && (
          <button
            className="adminBtn"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Menu
          </button>
        )}
      </header>

      {view === "menu" && (
        <main className="page">
          <section className="hero">
            <p>Order from your seat</p>
            <h2>Chai, munchies & sweet cravings.</h2>
            <span>
              Add your items, enter your name and contact number, then pay using
              UPI.
            </span>
          </section>

          <input
            className="search"
            placeholder="Search chai, fries, sandwich..."
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
                  <div className="foodIcon">{getItemIcon(item)}</div>

                  <div className="foodInfo">
                    <div className="foodTop">
                      <h3>{item.name}</h3>
                      <strong>{formatPrice(item.price)}</strong>
                    </div>

                    <p>{item.desc}</p>

                    <div className="foodBottom">
                      <span>{item.category}</span>

                      {!isItemAvailable(item.id) ? (
                        <button className="soldOutBtn" disabled>
                          Sold Out
                        </button>
                      ) : qty === 0 ? (
                        <button
                          className="addBtn"
                          onClick={() => addItem(item.id)}
                        >
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
          <p className="muted">Confirm your order and add your contact details.</p>

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
              Contact Number
              <input
                type="tel"
                placeholder="Example: 9876543210"
                value={customer.phone}
                onChange={(e) =>
                  setCustomer({ ...customer, phone: e.target.value })
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
              {latestOrder.id} • {latestOrder.customer.phone}
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
              Enter your UPI transaction/reference ID. Pantry staff will verify
              it manually.
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
          {newOrderAlert && (
            <div className="newOrderAlert">🔔 New order received</div>
          )}

          {isAdminPage && isAdminUnlocked && !soundEnabled && (
            <button className="enableSoundBtn" onClick={enableSound}>
              🔔 Enable Order Sound
            </button>
          )}

          <div className="adminHeader">
            <div>
              <p className="eyebrow">Staff Dashboard</p>
              <h2>Orders</h2>
            </div>

            <div className="adminHeaderActions">
              <button className="exportCsvBtn" onClick={downloadOrdersCsv}>
                Export CSV
              </button>

              <button className="clearBtn" onClick={clearOrders}>
                Clear
              </button>
            </div>
          </div>

          <div className="adminDateTabs">
            <button
              className={adminDateFilter === "today" ? "activeAdminFilter" : ""}
              onClick={() => setAdminDateFilter("today")}
            >
              Today
            </button>

            <button
              className={adminDateFilter === "all" ? "activeAdminFilter" : ""}
              onClick={() => setAdminDateFilter("all")}
            >
              All Orders
            </button>
          </div>

          <div className="adminFilterTabs">
            <button
              className={adminFilter === "active" ? "activeAdminFilter" : ""}
              onClick={() => setAdminFilter("active")}
            >
              Active ({activeOrders.length})
            </button>

            <button
              className={adminFilter === "completed" ? "activeAdminFilter" : ""}
              onClick={() => setAdminFilter("completed")}
            >
              Completed ({completedOrders.length})
            </button>
          </div>

          <div className="adminStatsGrid">
            <div className="adminStatCard">
              <span>Active</span>
              <strong>{activeOrders.length}</strong>
            </div>

            <div className="adminStatCard">
              <span>Completed</span>
              <strong>{completedOrders.length}</strong>
            </div>

            <div className="adminStatCard">
              <span>Verified Sales</span>
              <strong>{formatPrice(verifiedSalesTotal)}</strong>
            </div>

            <div className="adminStatCard">
              <span>Total Value</span>
              <strong>{formatPrice(totalOrderValue)}</strong>
            </div>
          </div>

          <div className="availabilityPanel">
            <h3>Item Availability</h3>
            <p>Mark items as sold out or available.</p>

            <div className="availabilityList">
              {menuItems.map((item) => (
                <div className="availabilityItem" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.category} • {formatPrice(item.price)}
                    </span>
                  </div>

                  <div className="availabilityActions">
  <button
    className="editMenuItemBtn"
    onClick={() => editMenuItem(item)}
  >
    Edit
  </button>

  <button
    className={isItemAvailable(item.id) ? "availableBtn" : "soldOutToggleBtn"}
    onClick={() => toggleItemAvailability(item.id)}
  >
    {isItemAvailable(item.id) ? "Available" : "Sold Out"}
  </button>
</div>
                </div>
              ))}
            </div>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="emptyBox">
              <h3>
                {adminFilter === "active"
                  ? "No active orders"
                  : "No completed orders"}
              </h3>
              <p>
                {adminFilter === "active"
                  ? "New orders will appear here after customers place them."
                  : "Delivered and cancelled orders will appear here."}
              </p>
            </div>
          ) : (
            <div className="ordersList">
              {visibleOrders.map((order) => (
                <div className="orderCard" key={order.id}>
                  <div className="orderTop">
                    <div>
                      <small>{order.time}</small>
                      <h3>{order.id}</h3>
                      <p>
                        {order.customer.name} •{" "}
                        {order.customer.phone || "No contact number"}
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

                  {order.paymentStatus !== "Payment verified" && (
                    <button
                      className="verifyPaymentBtn"
                      onClick={() => verifyPayment(order.id)}
                    >
                      Payment Verified
                    </button>
                  )}

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
                    <button
                      className="cancelOrderBtn"
                      onClick={() => {
                        const confirmCancel = window.confirm(
                          "Cancel this order?"
                        );
                        if (confirmCancel) {
                          updateStatus(order.id, "Cancelled");
                        }
                      }}
                    >
                      Cancel
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
