import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Restaurant, MenuCategory, MenuItem, DeliveryZone, OrderItem } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, MapPin, Utensils, Phone, Clock, ChevronRight, X, Search, Plus, Minus, Map as MapIcon, ClipboardList, MessageCircle, Trash2, MessageSquare } from "lucide-react";
import LocationPicker from "../components/LocationPicker";
import Chat from "../components/Chat";

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState<"dine-in" | "delivery">("dine-in");
  const [cart, setCart] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem("sufra_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOrders, setActiveOrders] = useState<string[]>(() => {
    const saved = localStorage.getItem("sufra_active_orders");
    return saved ? JSON.parse(saved) : [];
  });
  const [isActiveOrdersOpen, setIsActiveOrdersOpen] = useState(false);
  const [ordersWithStatus, setOrdersWithStatus] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [selectedChatOrderId, setSelectedChatOrderId] = useState<string | null>(null);

  // Delivery info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    localStorage.setItem("sufra_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("sufra_active_orders", JSON.stringify(activeOrders));
  }, [activeOrders]);

  useEffect(() => {
    if (activeOrders.length > 0) {
      const fetchOrdersStatus = async () => {
        if (isActiveOrdersOpen) setLoadingOrders(true);
        try {
          const results = await Promise.all(
            activeOrders.map(async (id) => {
              try {
                return await api.get(`/api/orders/${id}`);
              } catch (err) {
                console.error(`Order ${id} not found or error:`, err);
                return { id, status: 'deleted' };
              }
            })
          );
          
          const stillActive = results.filter(o => 
            o.status !== 'deleted'
          );

          // Only remove from activeOrders if they are deleted or if we want to clean up completed ones
          // For now, let's keep them in the list so the icon doesn't disappear immediately
          const activeOnly = results.filter(o => 
            o.status !== 'completed' && 
            o.status !== 'cancelled' && 
            o.status !== 'deleted'
          );

          if (activeOnly.length !== activeOrders.length) {
            // We keep them in the state for the UI, but update the localStorage for the next session
            // if we really want them gone. But for the current session, let's keep the icon visible.
          }
          
          setOrdersWithStatus(results.filter(o => o.status !== 'deleted'));

          // Check for unread messages
          let unreadSum = 0;
          const newUnreadCounts: Record<string, number> = {};
          for (const order of results) {
            if (order.status !== 'deleted') {
              const msgs = await api.get(`/api/orders/${order.id}/messages`);
              const lastRead = localStorage.getItem(`sufra_last_read_${order.id}`) || "0";
              const unread = msgs.filter((m: any) => m.sender === 'restaurant' && new Date(m.createdAt).getTime() > parseInt(lastRead)).length;
              newUnreadCounts[order.id] = unread;
              unreadSum += unread;
            }
          }
          setUnreadMessages(newUnreadCounts);
          setTotalUnread(unreadSum);
        } catch (e) {
          console.error("Error fetching orders status:", e);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrdersStatus();
      const interval = setInterval(fetchOrdersStatus, 5000);
      return () => clearInterval(interval);
    } else {
      setOrdersWithStatus([]);
      setTotalUnread(0);
      setUnreadMessages({});
    }
  }, [isActiveOrdersOpen, activeOrders]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const checkBlockStatus = async () => {
      const savedPhone = localStorage.getItem("sufra_customer_phone");
      if (savedPhone) {
        try {
          const blockedUsers = await api.get(`/api/restaurants/${restaurant.id}/blocked`);
          if (blockedUsers.some((b: any) => b.phone === savedPhone)) {
            setIsBlocked(true);
          }
        } catch (e) {
          console.error("Error checking block status:", e);
        }
      }
    };
    checkBlockStatus();
  }, [restaurant?.id]);

  useEffect(() => {
    if (customerPhone) {
      localStorage.setItem("sufra_customer_phone", customerPhone);
    }
  }, [customerPhone]);

  useEffect(() => {
    if (!slug) return;

    const fetchRestaurant = async () => {
      try {
        const restData = await api.get(`/api/restaurants/public/${slug}`);
        setRestaurant(restData);

        const cats = await api.get(`/api/restaurants/${restData.id}/categories`);
        setCategories(cats);
        if (cats.length > 0) setActiveCategory(cats[0].id);

        const itemsData = await api.get(`/api/restaurants/${restData.id}/items`);
        setItems(itemsData.filter((i: any) => i.isAvailable));

        const zonesData = await api.get(`/api/restaurants/${restData.id}/zones`);
        setZones(zonesData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [slug]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = orderType === "delivery" ? (selectedZone?.fee || 0) : 0;
  const total = subtotal + deliveryFee;

  const handleCheckout = async (viaWhatsapp: boolean = false) => {
    if (!restaurant) return;
    if (orderType === "delivery") {
      if (!customerName || !customerPhone || !customerAddress || !selectedZone) {
        alert("يرجى إكمال جميع معلومات التوصيل");
        return;
      }
    } else {
      if (!tableNumber || !customerPhone) {
        alert("يرجى إدخال رقم الطاولة ورقم الهاتف");
        return;
      }
    }

    try {
      const orderData = {
        restaurantId: restaurant.id,
        type: orderType,
        items: cart,
        subtotal,
        deliveryFee,
        total,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerAddress: orderType === "delivery" ? customerAddress : null,
        customerZone: orderType === "delivery" ? selectedZone?.name : null,
        googleMapsLink: orderType === "delivery" ? googleMapsLink : null,
        tableNumber: orderType === "dine-in" ? tableNumber : null,
      };

      const res = await api.post("/api/orders", orderData);
      localStorage.removeItem("sufra_cart");
      setCart([]); // Clear cart state immediately
      
      const newActiveOrders = [...activeOrders, res.id];
      setActiveOrders(newActiveOrders);
      localStorage.setItem("sufra_active_orders", JSON.stringify(newActiveOrders));
      
      // If WhatsApp is enabled and user chose it, redirect
      if (viaWhatsapp && restaurant.whatsappNumber) {
        const message = `طلب جديد من ${customerName || 'زبون'}\n` +
          `النوع: ${orderType === 'delivery' ? 'توصيل' : 'داخل المطعم'}\n` +
          `رقم الطلب: #${res.id.slice(-6)}\n` +
          `الأصناف:\n${cart.map(i => `- ${i.name} (${i.quantity}x)`).join('\n')}\n` +
          `الإجمالي: ${formatCurrency(total)}\n` +
          (orderType === 'delivery' ? `العنوان: ${customerAddress}\nالمنطقة: ${selectedZone?.name}\nالموقع: ${googleMapsLink}` : `رقم الطاولة: ${tableNumber}`);
        
        const whatsappUrl = `https://wa.me/${restaurant.whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }

      window.location.href = `/order/${res.id}`;
    } catch (error: any) {
      console.error("Error creating order:", error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert("حدث خطأ أثناء إرسال الطلب");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
            borderRadius: ["20%", "50%", "20%"]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-16 h-16 bg-red-600 mb-6 shadow-xl shadow-red-100"
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">سفرة</h2>
          <div className="flex items-center justify-center gap-1">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <Ban className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">عذراً، تم حظر وصولك</h1>
        <p className="text-gray-600 mb-8 max-w-xs leading-relaxed">
          لقد تم حظر رقمك من قبل إدارة المطعم بسبب مخالفة سياسات الطلب. يرجى التواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
        >
          تحديث الصفحة
        </button>
      </div>
    );
  }

  if (!restaurant) return <div className="flex items-center justify-center h-screen">المطعم غير موجود</div>;

  const filteredItems = items.filter(item => 
    (activeCategory === "all" ? true : item.categoryId === activeCategory) &&
    (searchQuery ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo && <img src={restaurant.logo} alt={restaurant.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />}
            <h1 className="font-bold text-lg text-gray-900">{restaurant.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {(activeOrders.length > 0 || localStorage.getItem("sufra_active_orders") !== "[]") && (
              <>
                <button 
                  onClick={() => {
                    if (activeOrders.length === 1) {
                      setSelectedChatOrderId(activeOrders[0]);
                    } else {
                      setIsActiveOrdersOpen(true);
                    }
                  }}
                  className="relative p-2 text-blue-600 bg-blue-50 rounded-full"
                >
                  <MessageSquare className="w-6 h-6" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                      {totalUnread}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setIsActiveOrdersOpen(true)}
                  className="relative p-2 text-red-600 bg-red-50 rounded-full"
                >
                  <ClipboardList className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {activeOrders.length || JSON.parse(localStorage.getItem("sufra_active_orders") || "[]").length}
                  </span>
                </button>
              </>
            )}
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-600">
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Order Type Toggle */}
        <div className="max-w-md mx-auto px-4 pb-4">
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button 
              onClick={() => setOrderType("dine-in")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                orderType === "dine-in" ? "bg-white shadow-sm text-red-600" : "text-gray-500"
              )}
            >
              <Utensils className="w-4 h-4" />
              داخل المطعم
            </button>
            <button 
              onClick={() => setOrderType("delivery")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                orderType === "delivery" ? "bg-white shadow-sm text-red-600" : "text-gray-500"
              )}
            >
              <MapPin className="w-4 h-4" />
              توصيل
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="ابحث عن وجبة..." 
            className="w-full bg-white border-none rounded-xl py-3 pr-10 pl-4 shadow-sm focus:ring-2 focus:ring-red-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-md mx-auto px-4 mt-6 overflow-x-auto no-scrollbar flex gap-3 pb-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeCategory === "all" ? "bg-red-600 text-white" : "bg-white text-gray-600 border border-gray-100"
          )}
        >
          الكل
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeCategory === cat.id ? "bg-red-600 text-white" : "bg-white text-gray-600 border border-gray-100"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="max-w-md mx-auto px-4 mt-6 grid grid-cols-2 gap-4">
        {filteredItems.map(item => (
          <motion.div 
            layout
            key={item.id} 
            className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col"
          >
            <div className="relative h-32 w-full overflow-hidden">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                  <Utensils className="w-8 h-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-2 right-2">
                <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg shadow-sm">
                  <span className="font-black text-xs text-gray-900">{formatCurrency(item.price)}</span>
                </div>
              </div>
              {!item.isAvailable && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold uppercase tracking-widest bg-red-600 px-2 py-0.5 rounded-full">نفذت</span>
                </div>
              )}
            </div>
            
            <div className="p-3 flex-1 flex flex-col">
              <h3 className="font-bold text-sm text-gray-900 line-clamp-1 mb-1 group-hover:text-red-600 transition-colors">{item.name}</h3>
              <p className="text-[10px] text-gray-400 leading-tight mb-3 line-clamp-2 flex-1">{item.description}</p>
              
              <button 
                onClick={() => addToCart(item)}
                disabled={!item.isAvailable}
                className="w-full bg-gray-900 text-white py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                إضافة
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Active Orders Modal */}
      <AnimatePresence>
        {isActiveOrdersOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">طلباتي النشطة</h2>
                <button onClick={() => setIsActiveOrdersOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {loadingOrders && ordersWithStatus.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">جاري تحميل الطلبات...</div>
                ) : ordersWithStatus.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">لا توجد طلبات نشطة حالياً</div>
                ) : (
                  ordersWithStatus.map(order => (
                    <div 
                      key={order.id}
                      onClick={() => navigate(`/order/${order.id}`)}
                      className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm relative">
                          <ClipboardList className="w-6 h-6" />
                          {unreadMessages[order.id] > 0 && (
                            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                              {unreadMessages[order.id]}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">طلب #{order.id.slice(-6)}</h4>
                          <p className="text-xs text-gray-500">
                            {order.status === 'pending' && 'قيد الانتظار'}
                            {order.status === 'preparing' && 'قيد التحضير'}
                            {order.status === 'out-for-delivery' && 'خارج للتوصيل'}
                            {order.status === 'completed' && 'تم التسليم'}
                            {order.status === 'cancelled' && 'تم الإلغاء'}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-red-600">{formatCurrency(order.total)}</p>
                        <ChevronRight className="w-5 h-5 text-gray-300 inline-block" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">سلة المشتريات</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (confirm("هل تريد إفراغ السلة؟")) setCart([]);
                    }} 
                    className="p-2 bg-red-50 rounded-full text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-gray-500">السلة فارغة</div>
              ) : (
                <>
                  <div className="space-y-4 mb-8">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg">
                          <button onClick={() => removeFromCart(item.id)} className="p-1 text-gray-500"><Minus className="w-4 h-4" /></button>
                          <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart(items.find(i => i.id === item.id)!)} className="p-1 text-red-600"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Details Form */}
                  <div className="space-y-4 border-t pt-6">
                    {orderType === "delivery" ? (
                      <>
                        <input 
                          type="text" 
                          placeholder="الاسم الكامل" 
                          className="w-full bg-gray-50 border-none rounded-xl py-3 px-4"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                        <input 
                          type="tel" 
                          placeholder="رقم الهاتف" 
                          className="w-full bg-gray-50 border-none rounded-xl py-3 px-4"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                        <select 
                          className="w-full bg-gray-50 border-none rounded-xl py-3 px-4"
                          value={selectedZone?.id || ""}
                          onChange={(e) => setSelectedZone(zones.find(z => z.id === e.target.value) || null)}
                        >
                          <option value="">اختر منطقة التوصيل</option>
                          {zones.map(zone => (
                            <option key={zone.id} value={zone.id}>{zone.name} (+{formatCurrency(zone.fee)})</option>
                          ))}
                        </select>
                        <textarea 
                          placeholder="العنوان بالتفصيل (الشارع، رقم الدار، علامة مميزة)" 
                          className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 h-20"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                        />
                        
                        <div className="space-y-3">
                          <div className={cn(
                            "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                            coords ? "text-green-600" : "text-blue-600"
                          )}>
                            <MapIcon className="w-5 h-5" />
                            {coords ? "تم تحديد الموقع بنجاح" : "حدد موقعك على الخريطة"}
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                            <LocationPicker 
                              onLocationSelect={(lat, lng) => {
                                setCoords({lat, lng});
                                setGoogleMapsLink(`https://www.google.com/maps?q=${lat},${lng}`);
                              }}
                              initialLocation={coords ? [coords.lat, coords.lng] : undefined}
                            />
                          </div>
                        </div>

                        <input 
                          type="text" 
                          placeholder="رابط الموقع (يتم تحديثه تلقائياً من الخريطة)" 
                          className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-xs text-gray-400"
                          value={googleMapsLink}
                          readOnly
                        />
                      </>
                    ) : (
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          placeholder="رقم الطاولة" 
                          className="w-full bg-gray-50 border-none rounded-xl py-3 px-4"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                        />
                        <input 
                          type="tel" 
                          placeholder="رقم الهاتف (للتحقق)" 
                          className="w-full bg-gray-50 border-none rounded-xl py-3 px-4"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="mt-8 space-y-2 border-t pt-4">
                    <div className="flex justify-between text-gray-600">
                      <span>المجموع الفرعي</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {orderType === "delivery" && (
                      <div className="flex justify-between text-gray-600">
                        <span>أجور التوصيل</span>
                        <span>{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
                      <span>الإجمالي</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button 
                      onClick={() => handleCheckout(false)}
                      className="flex-1 bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                    >
                      تأكيد الطلب
                    </button>
                    {restaurant.whatsappNumber && (
                      <button 
                        onClick={() => handleCheckout(true)}
                        className="flex-1 bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        واتساب
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {selectedChatOrderId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onViewportEnter={() => {
                localStorage.setItem(`sufra_last_read_${selectedChatOrderId}`, Date.now().toString());
              }}
              className="bg-white w-full max-w-md rounded-t-3xl h-[80vh] overflow-hidden flex flex-col"
            >
              <Chat 
                orderId={selectedChatOrderId} 
                userType="customer" 
                onClose={() => setSelectedChatOrderId(null)}
                restaurantName={restaurant?.name}
                restaurantLogo={restaurant?.logo}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-40">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-red-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-red-200"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-red-600 w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </div>
              <span className="font-bold">عرض السلة</span>
            </div>
            <span className="font-bold">{formatCurrency(total)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
