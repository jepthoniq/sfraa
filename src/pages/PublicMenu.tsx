import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Restaurant, MenuCategory, MenuItem, DeliveryZone, OrderItem } from "../types";
import { formatCurrency, cn, roundToNearest250 } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, MapPin, Utensils, Phone, Clock, ChevronRight, X, Search, Plus, Minus, Map as MapIcon, ClipboardList, MessageCircle, Trash2, MessageSquare, Ban, Ticket, Bell, Megaphone, User, LogOut, Smartphone } from "lucide-react";
import Chat from "../components/Chat";
import LoadingScreen from "../components/LoadingScreen";
import { io } from "socket.io-client";

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
    const saved = localStorage.getItem("zantex_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem("sufra_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  
  const [activeOrders, setActiveOrders] = useState<string[]>(() => {
    const saved = localStorage.getItem("zantex_active_orders");
    return saved ? JSON.parse(saved) : [];
  });
  const [isActiveOrdersOpen, setIsActiveOrdersOpen] = useState(false);
  const [ordersWithStatus, setOrdersWithStatus] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [selectedChatOrderId, setSelectedChatOrderId] = useState<string | null>(null);
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize sound
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  }, []);

  // Delivery info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discountPercentage: number} | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(localStorage.getItem(`verified_${customerPhone}`) === "true");
  const [alertModal, setAlertModal] = useState<{show: boolean, message: string, title?: string}>({ show: false, message: "" });
  const [confirmModal, setConfirmModal] = useState<{show: boolean, message: string, onConfirm: () => void}>({ show: false, message: "", onConfirm: () => {} });
  const [couponAlert, setCouponAlert] = useState<{code: string, discountPercentage: number} | null>(null);

  const showAlert = (message: string, title: string = "تنبيه") => {
    setAlertModal({ show: true, message, title });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, message, onConfirm });
  };

  useEffect(() => {
    localStorage.setItem("zantex_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("zantex_active_orders", JSON.stringify(activeOrders));
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
          const validOrders = results.filter(o => o.status !== 'deleted');

          if (validOrders.length !== activeOrders.length) {
            const validIds = validOrders.map(o => o.id);
            setActiveOrders(validIds);
            localStorage.setItem("zantex_active_orders", JSON.stringify(validIds));
          }
          
          setOrdersWithStatus(validOrders);

          // Check for unread messages
          let unreadSum = 0;
          const newUnreadCounts: Record<string, number> = {};
          for (const order of results) {
            if (order.status !== 'deleted') {
              const msgs = await api.get(`/api/orders/${order.id}/messages`);
              const lastRead = localStorage.getItem(`sufra_last_read_${order.id}`) || "0";
              const unread = msgs.filter((m: any) => m.sender === 'restaurant' && new Date(m.createdAt).getTime() > parseInt(lastRead)).length;
              if (unread > (unreadMessages[order.id] || 0)) {
                // Play sound for new messages
                audioRef.current?.play().catch(e => console.log("Sound blocked"));
              }
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
      const savedPhone = localStorage.getItem("zantex_customer_phone");
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
    if (user) {
      setCustomerPhone(user.phone || "");
      setCustomerName(user.name || "");
      setIsPhoneVerified(true);
    }
  }, [user]);

  useEffect(() => {
    if (customerPhone) {
      localStorage.setItem("zantex_customer_phone", customerPhone);
    }
  }, [customerPhone]);

  useEffect(() => {
    if (!slug) return;

    // Load cached data for immediate display on loading screen
    const cachedData = localStorage.getItem(`cached_rest_${slug}`);
    if (cachedData) {
      try {
        setRestaurant(JSON.parse(cachedData));
      } catch (e) {
        console.error("Error parsing cached restaurant:", e);
      }
    }

    const fetchRestaurant = async () => {
      try {
        const restData = await api.get(`/api/restaurants/public/${slug}`);
        setRestaurant(restData);
        // Cache basic info for next time
        localStorage.setItem(`cached_rest_${slug}`, JSON.stringify({
          id: restData.id,
          name: restData.name,
          logo: restData.logo,
          themeColor: restData.themeColor
        }));
        
        if (restData.isIpBlocked) {
          setIsBlocked(true);
        }

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

    // Socket.io for Real-time Coupon Alerts
    const socket = io(window.location.host === 'localhost:3000' ? 'http://localhost:3000' : window.location.origin);
    
    const restId = restaurant?.id || slug;
    
    socket.on(`coupon-alert-${restId}`, (data) => {
      setCouponAlert(data);
      // Store in persistent notifications if user is logged in or even if not
      const savedCoupons = JSON.parse(localStorage.getItem(`sufra_persistent_coupons_${restId}`) || "[]");
      if (!savedCoupons.some((c: any) => c.code === data.code)) {
        localStorage.setItem(`sufra_persistent_coupons_${restId}`, JSON.stringify([...savedCoupons, { ...data, timestamp: Date.now() }]));
      }
    });

    socket.on("global-coupon-alert", (data) => {
      // Show if it's from current restaurant or just show general if relevant
      if (data.slug === slug || data.restaurantId === restaurant?.id) {
        setCouponAlert(data);
        const rId = data.restaurantId || restaurant?.id;
        const savedCoupons = JSON.parse(localStorage.getItem(`sufra_persistent_coupons_${rId}`) || "[]");
        if (!savedCoupons.some((c: any) => c.code === data.code)) {
          localStorage.setItem(`sufra_persistent_coupons_${rId}`, JSON.stringify([...savedCoupons, { ...data, timestamp: Date.now() }]));
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [slug, restaurant?.id]);

  const addToCart = (item: MenuItem) => {
    if (addingItemId) return;
    setAddingItemId(item.id);
    
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      const priceToUse = item.discountPrice || item.price;
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: priceToUse, quantity: 1 }];
    });

    setTimeout(() => {
      setAddingItemId(null);
    }, 600);
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

  const handleSendLoginOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone) return;
    setIsLoginLoading(true);
    try {
      await api.post("/api/auth/customer-send-otp", { phone: loginPhone });
      setLoginOtpSent(true);
    } catch (e) {
      showAlert("فشل إرسال كود التحقق عبر الواتساب");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleVerifyLoginOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOtpCode) return;
    setIsLoginLoading(true);
    try {
      const { token, user } = await api.post("/api/auth/customer-verify-otp", { phone: loginPhone, code: loginOtpCode });
      localStorage.setItem("sufra_token", token);
      localStorage.setItem("sufra_user", JSON.stringify(user));
      localStorage.setItem(`verified_${user.phone || loginPhone}`, "true");
      localStorage.setItem("zantex_customer_phone", user.phone || loginPhone);
      setUser(user);
      setCustomerPhone(user.phone || loginPhone);
      setCustomerName(user.name || "");
      setIsPhoneVerified(true);
      setShowLoginModal(false);
      setLoginOtpSent(false);
      setLoginOtpCode("");
      setLoginPhone("");
      showAlert("تم تسجيل الدخول بنجاح", "مرحباً");
    } catch (e: any) {
      showAlert(e.response?.data?.error || "كود التحقق غير صحيح");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("متصفحك لا يدعم تحديد الموقع");
      return;
    }
    
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setGoogleMapsLink(`https://www.google.com/maps?q=${lat},${lng}`);
        setIsFetchingLocation(false);
      },
      (err) => {
        console.error(err);
        showAlert("فشل في تحديد الموقع. يرجى التأكد من تفعيل خدمات الموقع في جهازك.");
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validateCoupon = async () => {
    if (!restaurant || !couponInput) return;
    
    setIsValidatingCoupon(true);
    try {
      const result = await api.post(`/api/restaurants/${restaurant.id}/validate-coupon`, {
        code: couponInput.trim(),
        customerPhone: customerPhone.trim()
      });
      setAppliedCoupon({
        code: result.code,
        discountPercentage: Number(result.discountPercentage)
      });
      setCouponInput("");
      showAlert("تم تطبيق الخصم بنجاح: " + result.discountPercentage + "%");
    } catch (e: any) {
      showAlert(e.response?.data?.error || "كود الخصم غير صحيح أو غير مفعل حالياً");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const discountAmount = appliedCoupon ? Math.floor(subtotal * (Number(appliedCoupon.discountPercentage) / 100)) : 0;
  const deliveryFee = orderType === "delivery" ? (Number(selectedZone?.fee) || 0) : 0;
  const total = roundToNearest250(Math.max(0, subtotal - discountAmount + deliveryFee));

  const handleSendOTP = async () => {
    if (!customerPhone || !restaurant) return;
    setIsVerifyingOTP(true);
    try {
      await api.post("/api/auth/guest-send-otp", { 
        phone: customerPhone,
        restaurantId: restaurant.id 
      });
      setShowOTPModal(true);
    } catch (e) {
      showAlert("فشل إرسال كود التحقق عبر الواتساب");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const verifyAndCheckout = async () => {
    setIsVerifyingOTP(true);
    try {
      await api.post("/api/auth/guest-verify-otp", { phone: customerPhone, code: otpCode });
      localStorage.setItem(`verified_${customerPhone}`, "true");
      setIsPhoneVerified(true);
      setShowOTPModal(false);
      // Proceed with order creation
      await finalizeOrder();
    } catch (e) {
      showAlert("كود التحقق غير صحيح، يرجى التأكد من الرسالة الواردة على واتساب");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleCheckout = async (viaWhatsapp: boolean = false) => {
    if (!restaurant) return;
    if (orderType === "delivery") {
      if (!customerName || !customerPhone || !customerAddress || !selectedZone) {
        showAlert("يرجى إكمال جميع معلومات التوصيل");
        return;
      }
    } else {
      if (!tableNumber) {
        showAlert("يرجى إدخال رقم الطاولة");
        return;
      }
    }

    // Check if phone needs verification
    const verified = localStorage.getItem(`verified_${customerPhone}`) === "true";
    if (orderType === "delivery" && !verified) {
      await handleSendOTP();
      return;
    }

    await finalizeOrder(viaWhatsapp);
  };

  const finalizeOrder = async (viaWhatsapp: boolean = false) => {
    if (!restaurant) return;
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
        notes: orderNotes,
        couponCode: appliedCoupon?.code,
        discountAmount
      };

      const res = await api.post("/api/orders", orderData);
      localStorage.removeItem("zantex_cart");
      setCart([]); // Clear cart state immediately
      
      const newActiveOrders = [...activeOrders, res.id];
      setActiveOrders(newActiveOrders);
      localStorage.setItem("zantex_active_orders", JSON.stringify(newActiveOrders));
      
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
        showAlert(error.response.data.error);
      } else {
        showAlert("حدث خطأ أثناء إرسال الطلب");
      }
    }
  };

  if (loading) {
    return <LoadingScreen logo={restaurant?.logo} restaurantName={restaurant?.name} />;
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        {restaurant?.logo ? (
          <img src={restaurant.logo} alt={restaurant.name} className="w-24 h-24 rounded-full object-cover mb-6 shadow-md border-4 border-white" />
        ) : (
          <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-md border-4 border-white">
            <Ban className="w-12 h-12" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{restaurant?.name || "المطعم"}</h1>
        <h2 className="text-xl font-bold text-red-600 mb-4">عذراً، تم حظر وصولك</h2>
        <p className="text-gray-600 mb-8 max-w-xs leading-relaxed">
          لقد تم حظرك من قبل المطعم. يرجى التواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.
        </p>
        {restaurant?.whatsappNumber && (
          <a 
            href={`https://wa.me/${restaurant.whatsappNumber.replace(/\D/g, '')}`}
            target="_blank"
            className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-600 transition-all mb-4"
          >
            <MessageCircle className="w-5 h-5" />
            تواصل مع الإدارة
          </a>
        )}
        <button 
          onClick={() => window.location.reload()}
          className="text-gray-500 font-medium hover:text-gray-700 transition-all"
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

  const themeColor = restaurant.themeColor || "#dc2626";

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans" dir="rtl">
      <style>{`
        :root {
          --theme-color: ${themeColor};
          --theme-color-light: ${themeColor}15;
        }
        .bg-theme { background-color: var(--theme-color) !important; }
        .text-theme { color: var(--theme-color) !important; }
        .border-theme { border-color: var(--theme-color) !important; }
        .ring-theme:focus { --tw-ring-color: var(--theme-color) !important; }
        .bg-theme-light { background-color: var(--theme-color-light) !important; }
      `}</style>
      
      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 lg:p-10 relative shadow-2xl"
            >
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute left-6 top-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-theme-light text-theme rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">تسجيل الدخول</h2>
                <p className="text-gray-500 text-sm mt-1">أدخل رقم هاتفك لمتابعة طلباتك</p>
              </div>

              <form onSubmit={loginOtpSent ? handleVerifyLoginOTP : handleSendLoginOTP} className="space-y-6">
                {!loginOtpSent ? (
                  <div>
                    <label className="block text-sm font-bold mb-2 mr-1">رقم الهاتف</label>
                    <input 
                      type="tel" 
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-theme focus:bg-white rounded-2xl outline-none transition-all font-medium text-left"
                      placeholder="07XXXXXXXX"
                      style={{ direction: 'ltr' }}
                      required
                      disabled={isLoginLoading}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2 mr-1">
                      <label className="block text-sm font-bold">كود التحقق</label>
                      <button type="button" onClick={() => setLoginOtpSent(false)} className="text-xs text-theme font-bold">تغيير الرقم</button>
                    </div>
                    <input 
                      type="text" 
                      value={loginOtpCode}
                      onChange={(e) => setLoginOtpCode(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-theme focus:bg-white rounded-2xl outline-none transition-all font-black text-center tracking-[1em]"
                      placeholder="000000"
                      maxLength={6}
                      required
                      autoFocus
                      disabled={isLoginLoading}
                    />
                    <p className="text-[10px] text-gray-400 mt-2 text-center">أدخل الكود المرسل لـ WhatsApp (التجريبي: 121212)</p>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full bg-theme text-white py-4 rounded-2xl font-bold text-lg hover:bg-theme/90 transition-all shadow-xl shadow-theme/10 flex items-center justify-center gap-3"
                >
                  {isLoginLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (loginOtpSent ? "تأكيد الكود" : "إرسال كود التحقق")}
                  {!isLoginLoading && <MessageCircle className="w-5 h-5" />}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coupon Alert Modal */}
      <AnimatePresence>
        {couponAlert && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 left-0 h-2 bg-theme" />
              <div className="w-20 h-20 bg-theme-light text-theme rounded-full flex items-center justify-center mx-auto mb-6">
                <Megaphone className="w-10 h-10 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">عرض خاص جديد!</h2>
              <p className="text-gray-500 mb-6 font-medium leading-relaxed">
                قام المطعم للتو بتوفير كود خصم جديد بنسبة <span className="text-theme font-black">{couponAlert.discountPercentage}%</span>
              </p>
              <div className="bg-gray-100 p-4 rounded-2xl mb-8 flex flex-col items-center justify-center gap-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">كود الخصم</span>
                <span className="text-3xl font-black text-gray-900 tracking-[0.2em] font-mono">{couponAlert.code}</span>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setCouponInput(couponAlert.code);
                    setCouponAlert(null);
                    setIsCartOpen(true);
                  }}
                  className="w-full bg-theme text-white font-bold py-4 rounded-2xl shadow-lg shadow-theme/30 hover:scale-[1.02] transition-all"
                >
                  استخدام الكود الآن
                </button>
                <button 
                  onClick={() => setCouponAlert(null)}
                  className="w-full text-gray-400 font-bold py-2 hover:text-gray-600 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section (Desktop) */}
      <div className="hidden md:block relative h-[400px] w-full overflow-hidden mb-12">
        <div className="absolute inset-0">
          <img 
            src={restaurant.logo || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80"} 
            className="w-full h-full object-cover blur-sm brightness-50 scale-105"
            alt="Hero Background"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-gray-50" />
        <div className="relative max-w-5xl mx-auto h-full flex flex-col items-center justify-center text-center px-4">
          {restaurant.logo && (
            <motion.img 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              src={restaurant.logo} 
              className="w-32 h-32 rounded-full border-4 border-white shadow-2xl mb-6 object-cover"
              alt={restaurant.name}
              referrerPolicy="no-referrer"
            />
          )}
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-black text-white mb-4 drop-shadow-lg"
          >
            {restaurant.name}
          </motion.h1>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-6 text-white/90 font-medium"
          >
            {restaurant.address && <span className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full"><MapPin className="w-4 h-4 text-theme" /> {restaurant.address}</span>}
            {restaurant.whatsappNumber && <span className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full"><Phone className="w-4 h-4 text-theme" /> {restaurant.whatsappNumber}</span>}
          </motion.div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo && <img src={restaurant.logo} alt={restaurant.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />}
            <div>
              <h1 className="font-bold text-lg md:text-xl text-gray-900 leading-none">{restaurant.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            {/* Consolidated Notification & Chat Center */}
            {(user || activeOrders.length > 0 || totalUnread > 0) && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsActiveOrdersOpen(true)}
                  className="relative p-2 text-gray-500 hover:text-theme transition-all hover:scale-110 active:scale-95"
                  title="الطلبات والرسائل"
                >
                  <div className="relative">
                    <MessageSquare className="w-6 h-6" />
                    {totalUnread > 0 && (
                      <span className="absolute -top-2 -right-2 bg-theme text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                        {totalUnread}
                      </span>
                    )}
                  </div>
                </button>
                <button 
                  onClick={() => setIsActiveOrdersOpen(true)}
                  className="relative p-2 text-gray-500 hover:text-theme transition-all hover:scale-110 active:scale-95"
                  title="الإشعارات"
                >
                  <Bell className="w-6 h-6" />
                  {activeOrders.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-theme w-3 h-3 rounded-full border-2 border-white animate-pulse"></span>
                  )}
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-theme-light text-theme rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white cursor-default">
                  {user.phone ? user.phone.slice(-3) : <User className="w-5 h-5" />}
                </div>
                <button 
                  onClick={() => {
                    localStorage.removeItem("sufra_token");
                    localStorage.removeItem("sufra_user");
                    setUser(null);
                    window.location.reload();
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="خروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-bold text-xs hover:bg-theme-light hover:text-theme transition-all flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">دخول</span>
              </button>
            )}

            <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-600 hover:text-theme transition-all hover:scale-110 active:scale-95">
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-theme text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Order Type Toggle & Search (Desktop Layout) */}
        <div className="max-w-5xl mx-auto px-4 pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="bg-gray-100 p-1 rounded-xl flex w-full md:w-auto md:min-w-[300px]">
              <button 
                onClick={() => setOrderType("dine-in")}
                className={cn(
                  "flex-1 py-2 px-6 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                  orderType === "dine-in" ? "bg-white shadow-sm text-theme" : "text-gray-500"
                )}
              >
                <Utensils className="w-4 h-4" />
                داخل المطعم
              </button>
              <button 
                onClick={() => setOrderType("delivery")}
                className={cn(
                  "flex-1 py-2 px-6 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                  orderType === "delivery" ? "bg-white shadow-sm text-theme" : "text-gray-500"
                )}
              >
                <MapPin className="w-4 h-4" />
                توصيل
              </button>
            </div>
            
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="ابحث عن وجبة..." 
                className="w-full bg-gray-50 border-none rounded-xl py-3 pr-10 pl-4 shadow-sm focus:ring-2 focus:ring-theme ring-theme transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Categories Sidebar (Desktop) */}
          <aside className="hidden md:block w-64 shrink-0 sticky top-40 h-fit">
            <h3 className="font-bold text-gray-900 mb-4 px-2">الأقسام</h3>
            <div className="space-y-1">
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  activeCategory === "all" ? "bg-theme text-white shadow-lg shadow-theme/20" : "text-gray-600 hover:bg-white"
                )}
              >
                الكل
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    activeCategory === cat.id ? "bg-theme text-white shadow-lg shadow-theme/20" : "text-gray-600 hover:bg-white"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </aside>

          {/* Categories Mobile Scroll */}
          <div className="md:hidden overflow-x-auto no-scrollbar flex gap-3 pb-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeCategory === "all" ? "bg-theme text-white" : "bg-white text-gray-600 border border-gray-100"
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
                  activeCategory === cat.id ? "bg-theme text-white" : "bg-white text-gray-600 border border-gray-100"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredItems.map(item => (
                <motion.div 
                  layout
                  key={item.id} 
                  className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col"
                >
                  <div className="relative h-32 md:h-48 w-full overflow-hidden">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                        <Utensils className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute bottom-3 right-3">
                      <div className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-xl shadow-lg">
                        {item.discountPrice ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-400 line-through leading-none">{formatCurrency(item.price)}</span>
                            <span className="font-black text-sm text-green-600 leading-none">{formatCurrency(item.discountPrice)}</span>
                          </div>
                        ) : (
                          <span className="font-black text-sm text-gray-900">{formatCurrency(item.price)}</span>
                        )}
                      </div>
                    </div>
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xs font-bold uppercase tracking-widest bg-theme px-3 py-1 rounded-full">نفذت</span>
                      </div>
                    )}
                    {restaurant.whatsappNumber && (
                      <a 
                        href={`https://wa.me/${restaurant.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن وجبة: ${item.name}`)}`}
                        target="_blank"
                        className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg text-theme hover:scale-110 active:scale-95 transition-all z-10"
                        title="استفسار عن الوجبة"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm md:text-base text-gray-900 line-clamp-1 mb-1 group-hover:text-theme transition-colors">{item.name}</h3>
                    <p className="text-[10px] md:text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2 flex-1">{item.description}</p>
                    
                    <button 
                      onClick={() => addToCart(item)}
                      disabled={!item.isAvailable || addingItemId === item.id}
                      className="w-full bg-gray-900 text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-theme active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-gray-200 hover:shadow-theme/30"
                    >
                      {addingItemId === item.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          يرجى الانتظار...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          إضافة للسلة
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Orders Modal */}
      <AnimatePresence>
        {isActiveOrdersOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center md:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">طلباتي النشطة</h2>
                <button onClick={() => setIsActiveOrdersOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Persistent Coupons Section */}
                {(() => {
                  const savedCoupons = JSON.parse(localStorage.getItem(`sufra_persistent_coupons_${restaurant?.id}`) || "[]");
                  if (savedCoupons.length === 0) return null;
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
                        <Ticket className="w-3 h-3" />
                        عروض خاصة لك
                      </h3>
                      {savedCoupons.map((coupon: any, idx: number) => (
                        <div 
                          key={idx}
                          className="bg-theme-light p-5 rounded-3xl border-2 border-dashed border-theme/20 relative overflow-hidden group"
                        >
                          <div className="relative z-10 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-theme font-bold mb-1">كود خصم حصري</p>
                              <h4 className="text-xl font-black text-gray-900 tracking-wider">{coupon.code}</h4>
                              <p className="text-[10px] text-gray-500 mt-1">خصم بقيمة {coupon.discountPercentage}% على طلبك القادم</p>
                            </div>
                            <button 
                              onClick={() => {
                                setCouponInput(coupon.code);
                                setIsActiveOrdersOpen(false);
                                setIsCartOpen(true);
                              }}
                              className="bg-theme text-white p-3 rounded-2xl shadow-lg shadow-theme/20 hover:scale-105 transition-transform"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          {/* Decorative pattern */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-theme/5 rounded-full -mr-8 -mt-8 animate-pulse text-theme/10 flex items-center justify-center font-black text-4xl select-none">%</div>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          localStorage.setItem(`sufra_persistent_coupons_${restaurant?.id}`, "[]");
                          window.location.reload();
                        }}
                        className="w-full py-2 text-[10px] text-gray-400 font-bold hover:text-red-500 transition-colors"
                      >
                        مسح العروض
                      </button>
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <ClipboardList className="w-3 h-3" />
                    طلباتي
                  </h3>
                  {loadingOrders && ordersWithStatus.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">جاري تحميل الطلبات...</div>
                  ) : ordersWithStatus.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm font-medium bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 italic">لا توجد طلبات نشطة حالياً</div>
                  ) : (
                    ordersWithStatus.map(order => (
                      <div 
                        key={order.id}
                        onClick={() => navigate(`/order/${order.id}`)}
                        className="bg-gray-50 p-5 rounded-3xl flex items-center justify-between cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-gray-100 border border-transparent hover:border-gray-100 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-theme shadow-sm relative group-hover:scale-110 transition-transform">
                            <ClipboardList className="w-7 h-7" />
                            {unreadMessages[order.id] > 0 && (
                              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                {unreadMessages[order.id]}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">طلب #{order.id.slice(-6)}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {order.status === 'pending' && 'قيد الانتظار'}
                              {order.status === 'preparing' && 'قيد التحضير'}
                              {order.status === 'out-for-delivery' && 'خارج للتوصيل'}
                              {order.status === 'completed' && 'تم التسليم'}
                              {order.status === 'cancelled' && 'تم الإلغاء'}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-theme">{formatCurrency(order.total)}</p>
                          {order.discountAmount > 0 && (
                            <p className="text-[10px] text-green-600 font-bold">خصم {formatCurrency(order.discountAmount)}</p>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-300 inline-block mt-1 group-hover:translate-x-[-4px] transition-transform" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">سلة المشتريات</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      showConfirm("هل تريد إفراغ السلة؟", () => setCart([]));
                    }} 
                    className="p-3 bg-red-50 rounded-2xl text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsCartOpen(false)} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">السلة فارغة حالياً</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-8">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                        <div>
                          <h4 className="font-bold text-gray-900">{item.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-4 bg-white p-1.5 rounded-xl shadow-sm">
                          <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Minus className="w-4 h-4" /></button>
                          <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart(items.find(i => i.id === item.id)!)} className="p-1.5 text-theme hover:scale-110 transition-transform"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Details Form */}
                  <div className="space-y-5 border-t border-gray-100 pt-8">
                    {orderType === "delivery" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">الاسم الكامل</label>
                          <input 
                            type="text" 
                            placeholder="مثلاً: محمد علي" 
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-theme focus:bg-white rounded-2xl py-4 px-6 outline-none transition-all font-medium"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">رقم الهاتف</label>
                          <input 
                            type="tel" 
                            placeholder="07XXXXXXXXX" 
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-theme focus:bg-white rounded-2xl py-4 px-6 outline-none transition-all font-medium"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">منطقة التوصيل</label>
                          <select 
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-theme focus:bg-white rounded-2xl py-4 px-6 outline-none transition-all font-medium appearance-none"
                            value={selectedZone?.id || ""}
                            onChange={(e) => setSelectedZone(zones.find(z => z.id === e.target.value) || null)}
                          >
                            <option value="">اختر المنطقة</option>
                            {zones.map(zone => (
                              <option key={zone.id} value={zone.id}>{zone.name} (+{formatCurrency(zone.fee)})</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">العنوان بالتفصيل</label>
                          <textarea 
                            placeholder="الشارع، رقم الدار، علامة مميزة..." 
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-theme focus:bg-white rounded-2xl py-4 px-6 outline-none transition-all font-medium h-24 resize-none"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                          />
                        </div>
                        
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleGetLocation}
                            disabled={isFetchingLocation}
                            className={cn(
                              "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg",
                              coords 
                                ? "bg-green-50 text-green-600 border-2 border-green-200 shadow-green-100" 
                                : "bg-blue-50 text-blue-600 border-2 border-blue-200 shadow-blue-100 hover:bg-blue-100",
                              isFetchingLocation && "opacity-70 cursor-not-allowed"
                            )}
                          >
                            {isFetchingLocation ? (
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <MapIcon className="w-5 h-5" />
                            )}
                            {isFetchingLocation 
                              ? "جاري تحديد الموقع..." 
                              : coords 
                                ? "تم تحديد موقعك بنجاح" 
                                : "تحديد موقعي التلقائي"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">رقم الطاولة</label>
                        <input 
                          type="text" 
                          placeholder="أدخل رقم الطاولة" 
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-theme focus:bg-white rounded-2xl py-4 px-6 outline-none transition-all font-medium"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">ملاحظات إضافية</label>
                      <textarea 
                        placeholder="أي تفاصيل أخرى تود إضافتها للطلب..." 
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-theme focus:bg-white rounded-2xl py-4 px-6 outline-none transition-all font-medium h-24 resize-none"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="mt-6 bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200">
                    <label className="block text-xs font-bold text-gray-400 mb-3 mr-1 uppercase tracking-wider">كود الخصم</label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-4 py-3 md:px-6 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                            <Ticket className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                             <p className="font-bold text-green-900 text-sm truncate">تم تطبيق {appliedCoupon.code}</p>
                             <p className="text-[10px] text-green-600 font-bold">خصم {appliedCoupon.discountPercentage}% على الطلب</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setAppliedCoupon(null)}
                          className="text-xs font-bold text-red-500 hover:scale-110 transition-transform shrink-0 ml-2"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div className="relative group">
                        <input 
                          type="text" 
                          placeholder="أدخل الكود..." 
                          className="w-full bg-white border-2 border-transparent focus:border-theme rounded-2xl py-3.5 pr-6 pl-24 md:pl-28 outline-none transition-all font-mono uppercase text-sm shadow-sm"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                        />
                        <button 
                          onClick={validateCoupon}
                          disabled={!couponInput || isValidatingCoupon}
                          className="absolute left-2 top-2 bottom-2 bg-theme text-white font-bold px-4 md:px-6 rounded-xl hover:bg-theme/90 transition-all shadow-lg shadow-theme/10 disabled:opacity-50 disabled:grayscale text-xs md:text-sm"
                        >
                          {isValidatingCoupon ? (
                             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : "تطبيق"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="mt-8 space-y-3 bg-gray-50 p-6 rounded-3xl">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>المجموع الفرعي</span>
                      <span className="font-bold">{formatCurrency(subtotal)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="font-medium inline-flex items-center gap-1">
                          <Ticket className="w-3 h-3" /> خصم ({appliedCoupon.code})
                        </span>
                        <span className="font-bold italic">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {orderType === "delivery" && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>أجور التوصيل</span>
                        <span className="font-bold">{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-black text-gray-900 pt-3 border-t border-gray-200">
                      <span>الإجمالي</span>
                      <span className="text-theme">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-8">
                    <button 
                      onClick={() => handleCheckout(false)}
                      className="flex-1 bg-gray-900 text-white font-bold py-5 rounded-2xl hover:bg-theme transition-all shadow-xl shadow-gray-200 hover:shadow-theme/30"
                    >
                      تأكيد الطلب
                    </button>
                    {restaurant.whatsappNumber && (
                      <button 
                        onClick={() => handleCheckout(true)}
                        className="flex-1 bg-green-600 text-white font-bold py-5 rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-3"
                      >
                        <MessageCircle className="w-6 h-6" />
                        طلب عبر واتساب
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Modal */}
      <AnimatePresence>
        {alertModal.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 text-theme rounded-full flex items-center justify-center mx-auto mb-6">
                <Ban className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{alertModal.title}</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">{alertModal.message}</p>
              <button 
                onClick={() => setAlertModal({ ...alertModal, show: false })}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-theme transition-all shadow-lg"
              >
                موافق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد العملية</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal({ ...confirmModal, show: false });
                  }}
                  className="flex-1 bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition-all shadow-lg"
                >
                  تأكيد
                </button>
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOTPModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[120] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد عبر واتساب</h3>
              <p className="text-gray-500 mb-6 text-sm">أدخل الكود المرسل لـ <span className="font-bold underline" dir="ltr">{customerPhone}</span> عبر تطبيق واتساب</p>
              
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-theme rounded-2xl py-4 text-center text-2xl font-black tracking-[0.5em] outline-none transition-all"
                  autoFocus
                />
                
                <button 
                  onClick={verifyAndCheckout}
                  disabled={isVerifyingOTP || otpCode.length < 6}
                  className="w-full bg-theme text-white font-bold py-4 rounded-2xl hover:bg-theme/90 transition-all shadow-lg shadow-theme/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isVerifyingOTP ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : "تأكيد الطلب"}
                </button>
                
                <div className="pt-2">
                  <button 
                    onClick={() => setShowOTPModal(false)}
                    disabled={isVerifyingOTP}
                    className="w-full py-2 text-gray-400 text-xs font-bold hover:text-gray-600 transition-all"
                  >
                    إلغاء وتعديل البيانات
                  </button>
                </div>
              </div>
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
            className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onViewportEnter={() => {
                localStorage.setItem(`sufra_last_read_${selectedChatOrderId}`, Date.now().toString());
              }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] h-[80vh] overflow-hidden flex flex-col shadow-2xl"
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

      {/* Bottom Bar (Mobile Only) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-40">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-theme text-white p-5 rounded-2xl flex items-center justify-between shadow-2xl shadow-theme/30 animate-bounce-subtle"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-theme w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </div>
              <span className="font-bold">عرض السلة</span>
            </div>
            <span className="font-black">{formatCurrency(total)}</span>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-16 text-center border-t border-gray-100 mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start text-right mb-12">
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-bold text-gray-900 mb-4 text-xl">معلومات المطعم</h4>
            <div className="space-y-4 text-base text-gray-500">
              <p className="flex items-center gap-3"><MapPin className="w-5 h-5 text-theme" /> {restaurant.address || "العنوان غير متوفر"}</p>
              <p className="flex items-center gap-3"><Phone className="w-5 h-5 text-theme" /> {restaurant.whatsappNumber || "رقم الهاتف غير متوفر"}</p>
              <p className="flex items-center gap-3"><Clock className="w-5 h-5 text-theme" /> متوفر الآن لاستقبال طلباتكم</p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-bold text-gray-900 mb-4 text-xl">تواصل معنا</h4>
            <p className="text-gray-400 mb-6 text-sm">نحن هنا لخدمتكم، لا تتردد في التواصل معنا لأي استفسار.</p>
            <div className="flex gap-4">
              {restaurant.whatsappNumber && (
                <a 
                  href={`https://wa.me/${restaurant.whatsappNumber}`} 
                  target="_blank"
                  className="bg-green-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-3 hover:bg-green-600 transition-all shadow-lg shadow-green-100"
                >
                  <MessageCircle className="w-5 h-5" />
                  راسلنا عبر واتساب
                </a>
              )}
              <a 
                href={`tel:${restaurant.whatsappNumber}`} 
                className="bg-theme text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-theme/20"
              >
                <Phone className="w-5 h-5" />
                اتصل بنا
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-50 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-400 text-sm font-medium">جميع الحقوق محفوظة © {new Date().getFullYear()} {restaurant.name}</p>
        </div>
      </footer>
    </div>
  );
}
