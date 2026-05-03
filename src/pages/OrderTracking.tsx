import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Order, Restaurant } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { motion } from "motion/react";
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  Utensils, 
  Phone, 
  MessageCircle,
  MessageSquare,
  ChevronRight,
  Bell,
  MapPin,
  ShoppingBag,
  ExternalLink,
  ClipboardList,
  X
} from "lucide-react";
import LoadingScreen from "../components/LoadingScreen";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import Chat from "../components/Chat";
import { AnimatePresence } from "motion/react";

// Fix for default marker icon in Leaflet using CDN links
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function OrderTracking() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeOrders, setActiveOrders] = useState<string[]>(() => {
    const saved = localStorage.getItem("zantex_active_orders");
    return saved ? JSON.parse(saved) : [];
  });
  const [isActiveOrdersOpen, setIsActiveOrdersOpen] = useState(false);
  const [ordersWithStatus, setOrdersWithStatus] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize sound
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  }, []);

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
                return { id, status: 'deleted' };
              }
            })
          );
          
          const stillActive = results.filter(o => 
            o.status !== 'completed' && 
            o.status !== 'cancelled' && 
            o.status !== 'deleted'
          );

          if (stillActive.length !== activeOrders.length) {
            setActiveOrders(stillActive.map(o => o.id));
            localStorage.setItem("zantex_active_orders", JSON.stringify(stillActive.map(o => o.id)));
          }
          
          let unreadSum = 0;
          for (const o of results) {
            if (o.status !== 'deleted') {
              const msgs = await api.get(`/api/orders/${o.id}/messages`);
              const lastRead = localStorage.getItem(`sufra_last_read_${o.id}`) || "0";
              const unread = msgs.filter((m: any) => m.sender === 'restaurant' && new Date(m.createdAt).getTime() > parseInt(lastRead)).length;
              unreadSum += unread;
            }
          }
          
          if (unreadSum > totalUnread) {
            audioRef.current?.play().catch(e => console.log("Sound blocked"));
          }
          setTotalUnread(unreadSum);
          setOrdersWithStatus(results.filter(o => o.status !== 'deleted'));
        } catch (e) {
          console.error("Error fetching orders status:", e);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrdersStatus();
      const interval = setInterval(fetchOrdersStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isActiveOrdersOpen, activeOrders]);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const orderData = await api.get(`/api/orders/${orderId}`);
        setOrder(orderData);

        // Fetch restaurant info
        if (!restaurant) {
          const restData = await api.get(`/api/restaurants/${orderData.restaurant_id}`);
          setRestaurant(restData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId, restaurant]);

  useEffect(() => {
    if (order?.status === 'completed' || order?.status === 'cancelled') {
      const saved = localStorage.getItem("zantex_active_orders");
      if (saved) {
        const activeOrders = JSON.parse(saved) as string[];
        const filtered = activeOrders.filter(id => id !== orderId);
        localStorage.setItem("zantex_active_orders", JSON.stringify(filtered));
      }
    }
  }, [order?.status, orderId]);

  const handleCancelOrder = async () => {
    if (!orderId) return;
    setIsCancelling(true);
    try {
      await api.patch(`/api/orders/${orderId}/cancel`, {});
      const orderData = await api.get(`/api/orders/${orderId}`);
      setOrder(orderData);
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل إلغاء الطلب");
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!order) return <div className="flex items-center justify-center h-screen">الطلب غير موجود</div>;

  const steps = [
    { id: "pending", label: "تم استلام الطلب", icon: Clock },
    { id: "preparing", label: "قيد التحضير", icon: Utensils },
    { id: order.type === "delivery" ? "out-for-delivery" : "completed", label: order.type === "delivery" ? "خارج للتوصيل" : "جاهز للتقديم", icon: order.type === "delivery" ? Truck : CheckCircle2 },
    { id: "completed", label: "تم التسليم", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status);

  const getCoordsFromLink = (link: string | null) => {
    if (!link) return null;
    const match = link.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])] as [number, number];
    }
    return null;
  };

  const orderCoords = getCoordsFromLink(order.googleMapsLink);

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-600">
            <ChevronRight className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg text-gray-900">تتبع الطلب</h1>
          <div className="flex items-center gap-2">
            {(activeOrders.length > 0 || totalUnread > 0) && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsActiveOrdersOpen(true)}
                  className="relative p-2 text-gray-500 hover:text-red-600 transition-all hover:scale-110 active:scale-95"
                >
                  <div className="relative">
                    <MessageSquare className="w-6 h-6" />
                    {totalUnread > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                        {totalUnread}
                      </span>
                    )}
                  </div>
                </button>
                <button 
                  onClick={() => setIsActiveOrdersOpen(true)}
                  className="relative p-2 text-gray-500 hover:text-red-600 transition-all hover:scale-110 active:scale-95"
                >
                  <div className="relative">
                    <Bell className="w-6 h-6" />
                    {activeOrders.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-red-600 w-3 h-3 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                  </div>
                </button>
              </div>
            )}
            <div className="relative">
              <ShoppingBag className={cn(
                "w-6 h-6 transition-all",
                order.status === "preparing" || order.status === "out-for-delivery" ? "text-red-600 animate-bounce" : "text-gray-400"
              )} />
              {(order.status === "preparing" || order.status === "out-for-delivery") && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            {order.status === "pending" && <Clock className="w-10 h-10 animate-pulse" />}
            {order.status === "preparing" && <Utensils className="w-10 h-10 animate-bounce" />}
            {order.status === "out-for-delivery" && <Truck className="w-10 h-10 animate-bounce" />}
            {order.status === "completed" && <CheckCircle2 className="w-10 h-10" />}
            {order.status === "cancelled" && <ShoppingBag className="w-10 h-10 text-gray-400" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {order.status === "cancelled" ? "تم إلغاء الطلب" : steps[currentStepIndex]?.label || order.status}
          </h2>
          <p className="text-gray-500 text-sm">رقم الطلب: #{order.id.slice(-6)}</p>
          
          {order.status === 'pending' && (
            <button 
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="mt-6 text-red-600 text-sm font-bold border border-red-100 px-6 py-2 rounded-xl hover:bg-red-50 transition-all disabled:opacity-50"
            >
              {isCancelling ? "جاري الإلغاء..." : "إلغاء الطلب"}
            </button>
          )}
        </div>

        {/* Map Display */}
        {orderCoords && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 h-64 relative">
            <MapContainer 
              center={orderCoords} 
              zoom={15} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
              dragging={false}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={orderCoords} />
            </MapContainer>
            <div className="absolute bottom-4 right-4 z-[1000]">
              <a 
                href={order.googleMapsLink!} 
                target="_blank" 
                className="bg-white px-4 py-2 rounded-xl shadow-lg text-xs font-bold text-red-600 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                فتح في الخرائط
              </a>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        {order.status !== "cancelled" && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="space-y-8 relative">
              {/* Vertical Line */}
              <div className="absolute right-[19px] top-2 bottom-2 w-0.5 bg-gray-100" />
              
              {steps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-center gap-6 relative z-10">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                      isCompleted ? "bg-red-600 text-white shadow-lg shadow-red-100" : "bg-white border-2 border-gray-100 text-gray-300"
                    )}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={cn(
                        "font-bold transition-all",
                        isCompleted ? "text-gray-900" : "text-gray-300"
                      )}>
                        {step.label}
                      </p>
                      {isCurrent && <p className="text-xs text-red-600 font-medium">الآن</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">ملخص الطلب</h3>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name} x {item.quantity}</span>
                <span className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-50 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>المجموع الفرعي</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                   <span>الخصم</span>
                   <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              {order.type === "delivery" && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>أجور التوصيل</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-red-600 pt-2">
                <span>الإجمالي</span>
                <div className="text-left">
                  <span className="block">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Restaurant Contact */}
        {restaurant?.whatsappNumber && (
          <div className="bg-gray-900 rounded-3xl p-6 text-white flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">هل لديك استفسار؟</p>
              <p className="font-bold">تواصل مع المطعم</p>
            </div>
            <div className="flex gap-2">
              <a 
                href={`tel:${restaurant.whatsappNumber}`}
                className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <Phone className="w-5 h-5" />
              </a>
              <a 
                href={`https://wa.me/${restaurant.whatsappNumber.replace(/\D/g, '')}`}
                target="_blank"
                className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center hover:bg-green-600 transition-all"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-xs text-gray-400 mb-1">مدعوم بواسطة زانتكس للمطاعم</p>
          <p className="text-red-600 text-[10px] font-bold">حقوق الملكية: حسين علي الجبوري</p>
        </div>
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
                  ordersWithStatus.map(o => (
                    <div 
                      key={o.id}
                      onClick={() => {
                        if (o.id !== orderId) {
                          window.location.href = `/order/${o.id}`;
                        }
                        setIsActiveOrdersOpen(false);
                      }}
                      className={cn(
                        "p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all",
                        o.id === orderId ? "bg-red-50 border border-red-100" : "bg-gray-50 hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                          <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">طلب #{o.id.slice(-6)}</h4>
                          <p className="text-xs text-gray-500">
                            {o.status === 'pending' && 'قيد الانتظار'}
                            {o.status === 'preparing' && 'قيد التحضير'}
                            {o.status === 'out-for-delivery' && 'خارج للتوصيل'}
                            {o.status === 'completed' && 'تم التسليم'}
                            {o.status === 'cancelled' && 'تم الإلغاء'}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-red-600">{formatCurrency(o.total)}</p>
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

      {/* Floating Chat Button */}
      <button 
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
      </button>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            onViewportEnter={() => {
              localStorage.setItem(`zantex_last_read_${orderId}`, Date.now().toString());
            }}
            className="fixed inset-0 z-50 md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[600px] p-4 md:p-0"
          >
            <div className="h-full">
              <Chat 
                orderId={orderId!} 
                userType="customer" 
                onClose={() => setShowChat(false)}
                restaurantName={restaurant?.name}
                restaurantLogo={restaurant?.logo}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
