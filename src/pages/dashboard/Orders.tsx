import React, { useState, useEffect, useRef } from "react";
import { api } from "../../lib/api";
import { Order } from "../../types";
import { formatCurrency, cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { io } from "socket.io-client";
import { 
  Phone, 
  MessageCircle, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  ChevronDown,
  ExternalLink,
  Utensils,
  MapPin,
  ClipboardList,
  Trash2,
  Ban,
  ShieldCheck,
  Bell,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Chat from "../../components/Chat";

export default function Orders({ restaurantId }: { restaurantId?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"active" | "dine-in" | "delivery" | "blocked" | "history">("active");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [blockedIPs, setBlockedIPs] = useState<string[]>([]);
  
  // Real-time Notifications State
  const [newOrderNotification, setNewOrderNotification] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    // Socket.io Setup
    const socket = io(window.location.origin);
    
    socket.emit("join-restaurant", restaurantId);

    socket.on("new-order", (order) => {
      // Play Sound
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Sound play error:", e));
      }
      
      // Update List
      setOrders(prev => [
        { ...order, items: [], status: 'pending', createdAt: new Date(order.createdAt) } as any,
        ...prev
      ]);

      // Show Notification
      setNewOrderNotification({ ...order, msg: "طلب جديد وصل!" });
      
      // Auto-fetch to get full details
      fetchOrders();
    });

    socket.on("new-message", (data) => {
      // Play Sound for message
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Sound play error:", e));
      }
      
      setUnreadCounts(prev => ({
        ...prev,
        [data.orderId]: (prev[data.orderId] || 0) + 1
      }));

      // Find the order and set it as selected
      const currentOrder = orders.find(o => o.id === data.orderId);
      if (currentOrder) {
        setSelectedOrder(currentOrder);
        setShowChat(true);
      } else {
        // If not in current list, fetch orders then try to find it
        fetchOrders().then((newOrders) => {
          const found = newOrders.find((o: any) => o.id === data.orderId);
          if (found) {
            setSelectedOrder(found);
            setShowChat(true);
          }
        });
      }

      // Show Notification
      setNewOrderNotification({ 
        orderId: data.orderId, 
        total: 0, 
        msg: "رسالة جديدة من زبون",
        customerName: data.sender === 'customer' ? 'الزبون' : 'المطعم'
      });
    });

    const fetchOrders = async (): Promise<Order[]> => {
      try {
        const data = await api.get(`/api/restaurants/${restaurantId}/orders`);
        setOrders(data);
        return data;
      } catch (e) {
        console.error(e);
        return [];
      }
    };

    fetchOrders();
    
    return () => {
      socket.disconnect();
    };
  }, [restaurantId]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } as Order : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status } as Order);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/orders/${orderId}`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedOrder(null);
      setOrderToDelete(null);
    } catch (error: any) {
      alert(error.message || "حدث خطأ أثناء حذف الطلب");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleBlock = async (ip: string) => {
    if (!restaurantId || !ip) return;
    const isBlocked = blockedIPs.includes(ip);
    try {
      if (isBlocked) {
        await api.delete(`/api/restaurants/${restaurantId}/unblock-ip/${ip}`);
        setBlockedIPs(prev => prev.filter(p => p !== ip));
      } else {
        await api.post(`/api/restaurants/${restaurantId}/block-ip`, { ip });
        setBlockedIPs(prev => [...prev, ip]);
      }
    } catch (e) {
      console.error(e);
      alert("فشل تحديث حالة الحظر");
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === "blocked") return false; // Handled separately
    if (filter === "history") return o.status === "completed" || o.status === "cancelled";
    
    // For other filters, we only show active orders by default
    const isActive = o.status !== "completed" && o.status !== "cancelled";
    
    if (filter === "active") return isActive;
    return o.type === filter && isActive;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "preparing": return "bg-blue-100 text-blue-700";
      case "out-for-delivery": return "bg-purple-100 text-purple-700";
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "قيد الانتظار";
      case "preparing": return "قيد التحضير";
      case "out-for-delivery": return "خارج للتوصيل";
      case "completed": return "مكتمل";
      case "cancelled": return "ملغي";
      default: return status;
    }
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>${item.name} x ${item.quantity}</span>
        <span>${formatCurrency(item.price * item.quantity)}</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Order #${order.id.slice(-6)}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 5mm; direction: rtl; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .section { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .total { font-weight: bold; font-size: 1.2em; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${order.type === 'delivery' ? 'طلب توصيل' : 'طلب طاولة'}</h2>
            <p>رقم الطلب: #${order.id.slice(-6)}</p>
            <p>${format(order.createdAt, "yyyy/MM/dd HH:mm")}</p>
          </div>
          <div class="section">
            ${order.type === 'delivery' ? `
              <p>الزبون: ${order.customerName}</p>
              <p>الهاتف: ${order.customerPhone}</p>
              <p>العنوان: ${order.customerAddress}</p>
              <p>المنطقة: ${order.customerZone}</p>
            ` : `
              <p>رقم الطاولة: ${order.tableNumber}</p>
            `}
          </div>
          <div class="section">
            ${itemsHtml}
          </div>
          <div class="total">
            <div style="display: flex; justify-content: space-between;">
              <span>المجموع الفرعي:</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            ${order.type === 'delivery' ? `
              <div style="display: flex; justify-content: space-between;">
                <span>أجور التوصيل:</span>
                <span>${formatCurrency(order.deliveryFee)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px;">
              <span>الإجمالي:</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>
          <div class="footer">
            <p>شكراً لطلبكم!</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Audio for notifications */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      {/* New Order Notification Overlay */}
      <AnimatePresence>
        {newOrderNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm"
          >
            <div className="bg-gray-900 text-white p-4 rounded-3xl shadow-2xl border border-gray-800 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center animate-bounce">
                <Bell className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-black text-red-500 text-xs mb-1">{newOrderNotification.msg}</p>
                <p className="font-bold text-sm">
                  {newOrderNotification.type === 'delivery' ? `توصيل لـ ${newOrderNotification.customerName}` : 
                   newOrderNotification.tableNumber ? `طاولة رقم ${newOrderNotification.tableNumber}` : 
                   newOrderNotification.customerName || 'إشعار جديد'}
                </p>
                {newOrderNotification.total > 0 && <p className="text-[10px] text-gray-400">{formatCurrency(newOrderNotification.total)}</p>}
              </div>
              <button 
                onClick={() => setNewOrderNotification(null)}
                className="p-2 hover:bg-gray-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الطلبات الحالية</h1>
          <p className="text-gray-500">إدارة ومتابعة طلبات الزبائن مباشرة</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar max-w-full">
          <button 
            onClick={() => setFilter("active")}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap", filter === "active" ? "bg-red-600 text-white" : "text-gray-600")}
          >
            النشطة
          </button>
          <button 
            onClick={() => setFilter("dine-in")}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap", filter === "dine-in" ? "bg-red-600 text-white" : "text-gray-600")}
          >
            <Utensils className="w-4 h-4" />
            داخلي
          </button>
          <button 
            onClick={() => setFilter("delivery")}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap", filter === "delivery" ? "bg-red-600 text-white" : "text-gray-600")}
          >
            <MapPin className="w-4 h-4" />
            توصيل
          </button>
          <button 
            onClick={() => setFilter("history")}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap", filter === "history" ? "bg-red-600 text-white" : "text-gray-600")}
          >
            <ClipboardList className="w-4 h-4" />
            الأرشيف
          </button>
          <button 
            onClick={() => setFilter("blocked")}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap", filter === "blocked" ? "bg-red-600 text-white" : "text-gray-600")}
          >
            <Ban className="w-4 h-4" />
            المحظورين
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] no-scrollbar pr-1">
          {filter === "blocked" ? (
            blockedIPs.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد أرقام محظورة</p>
              </div>
            ) : (
              blockedIPs.map(ip => (
                <div key={ip} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                      <Ban className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{ip}</p>
                      <p className="text-xs text-gray-500">جهاز محظور</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleBlock(ip)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </button>
                </div>
              ))
            )
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد طلبات حالياً</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <motion.div
                layout
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "bg-white p-4 rounded-2xl shadow-sm border-2 cursor-pointer transition-all",
                  selectedOrder?.id === order.id ? "border-red-500" : "border-transparent hover:border-gray-200"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase", getStatusColor(order.status))}>
                    {getStatusLabel(order.status)}
                  </span>
                  <span className="text-xs text-gray-400">{format(order.createdAt, "HH:mm")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {order.type === "delivery" ? order.customerName : `طاولة ${order.tableNumber}`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {order.items.length} أصناف • {formatCurrency(order.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(order.status === "completed" || order.status === "cancelled") && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToDelete(order.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center relative",
                      order.type === "delivery" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {order.type === "delivery" ? <Truck className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
                      {unreadCounts[order.id] > 0 && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                          {unreadCounts[order.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Order Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col"
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">تفاصيل الطلب #{selectedOrder.id.slice(-6)}</h2>
                    <p className="text-sm text-gray-500">{format(selectedOrder.createdAt, "eeee, d MMMM yyyy HH:mm", { locale: ar })}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handlePrint(selectedOrder)}
                      className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowChat(true)}
                      className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 hover:bg-blue-100 transition-all"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    {(selectedOrder.status === "completed" || selectedOrder.status === "cancelled") && (
                      <button 
                        onClick={() => setOrderToDelete(selectedOrder.id)}
                        disabled={isDeleting}
                        className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedOrder(null)}
                      className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 lg:hidden"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">معلومات الزبون</h3>
                      <div className="space-y-3">
                        {selectedOrder.type === "delivery" ? (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><Phone className="w-4 h-4" /></div>
                              <div>
                                <p className="text-xs text-gray-500">الاسم والهاتف</p>
                                <p className="font-bold text-gray-900">{selectedOrder.customerName} • {selectedOrder.customerPhone}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><MapPin className="w-4 h-4" /></div>
                              <div>
                                <p className="text-xs text-gray-500">العنوان والمنطقة</p>
                                <p className="font-bold text-gray-900">{selectedOrder.customerZone} - {selectedOrder.customerAddress}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Utensils className="w-5 h-5" /></div>
                              <div>
                                <p className="text-xs text-gray-500">رقم الطاولة</p>
                                <p className="text-xl font-bold text-gray-900">{selectedOrder.tableNumber}</p>
                              </div>
                            </div>
                            {selectedOrder.customerPhone && (
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><Phone className="w-4 h-4" /></div>
                                <div>
                                  <p className="text-xs text-gray-500">رقم الهاتف</p>
                                  <p className="font-bold text-gray-900">{selectedOrder.customerPhone}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><Ban className="w-4 h-4" /></div>
                              <div>
                                <p className="text-xs text-gray-500">عنوان الجهاز (IP)</p>
                                <p className="font-bold text-gray-900">{selectedOrder.customerIp || 'غير متاح'}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedOrder.notes && (
                          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
                            <h4 className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-1">ملاحظات الزبون</h4>
                            <p className="text-sm text-yellow-900 font-medium">{selectedOrder.notes}</p>
                          </div>
                        )}

                        {selectedOrder.customerPhone && (
                          <>
                            <div className="flex gap-2 pt-2">
                              <a 
                                href={`tel:${selectedOrder.customerPhone}`}
                                className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
                              >
                                <Phone className="w-4 h-4" />
                                اتصال
                              </a>
                              <a 
                                href={`https://wa.me/${selectedOrder.customerPhone?.replace(/\D/g, '')}`}
                                target="_blank"
                                className="flex-1 bg-green-50 text-green-600 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-all"
                              >
                                <MessageCircle className="w-4 h-4" />
                                واتساب
                              </a>
                              {selectedOrder.type === "delivery" && selectedOrder.googleMapsLink && (
                                <a 
                                  href={selectedOrder.googleMapsLink}
                                  target="_blank"
                                  className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  الخريطة
                                </a>
                              )}
                            </div>
                          </>
                        )}
                        
                        {selectedOrder.customerIp && (
                          <button 
                            onClick={() => toggleBlock(selectedOrder.customerIp!)}
                            className={cn(
                              "w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all mt-2",
                              blockedIPs.includes(selectedOrder.customerIp) 
                                ? "bg-green-50 text-green-600 hover:bg-green-100" 
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                            )}
                          >
                            {blockedIPs.includes(selectedOrder.customerIp) ? (
                              <><ShieldCheck className="w-4 h-4" /> إلغاء حظر الجهاز</>
                            ) : (
                              <><Ban className="w-4 h-4" /> حظر هذا الجهاز</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">حالة الطلب</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => updateStatus(selectedOrder.id, "preparing")}
                          className={cn("py-2 rounded-xl text-xs font-bold transition-all", selectedOrder.status === "preparing" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                        >
                          تحضير
                        </button>
                        {selectedOrder.type === "delivery" && (
                          <button 
                            onClick={() => updateStatus(selectedOrder.id, "out-for-delivery")}
                            className={cn("py-2 rounded-xl text-xs font-bold transition-all", selectedOrder.status === "out-for-delivery" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                          >
                            توصيل
                          </button>
                        )}
                        <button 
                          onClick={() => updateStatus(selectedOrder.id, "completed")}
                          className={cn("py-2 rounded-xl text-xs font-bold transition-all", selectedOrder.status === "completed" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                        >
                          اكتمال
                        </button>
                        <button 
                          onClick={() => updateStatus(selectedOrder.id, "cancelled")}
                          className={cn("py-2 rounded-xl text-xs font-bold transition-all", selectedOrder.status === "cancelled" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">الأصناف المطلوبة</h3>
                    <div className="bg-gray-50 rounded-2xl overflow-hidden">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-red-600 shadow-sm">
                              {item.quantity}
                            </div>
                            <span className="font-bold text-gray-900">{item.name}</span>
                          </div>
                          <span className="font-medium text-gray-600">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-3 bg-gray-900 text-white p-6 rounded-3xl">
                    <div className="flex justify-between text-gray-400 text-sm">
                      <span>المجموع الفرعي</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-green-400 text-sm">
                        <span>الخصم</span>
                        <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                      </div>
                    )}
                    {selectedOrder.type === "delivery" && (
                      <div className="flex justify-between text-gray-400 text-sm">
                        <span>أجور التوصيل</span>
                        <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-800">
                      <span>الإجمالي</span>
                      <span className="text-red-500">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center h-full bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400">
                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <ClipboardList className="w-10 h-10" />
                </div>
                <p>اختر طلباً لعرض التفاصيل</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onViewportEnter={() => {
                localStorage.setItem(`sufra_admin_last_read_${selectedOrder.id}`, Date.now().toString());
              }}
              className="w-full max-w-md h-[600px]"
            >
              <Chat 
                orderId={selectedOrder.id} 
                userType="restaurant" 
                onClose={() => setShowChat(false)} 
                customerIp={selectedOrder.customerIp}
                isBlocked={blockedIPs.includes(selectedOrder.customerIp || "")}
                onBlockToggle={() => selectedOrder.customerIp && toggleBlock(selectedOrder.customerIp)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">حذف الطلب؟</h2>
            <p className="text-gray-500 mb-6">هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => deleteOrder(orderToDelete)} 
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isDeleting ? "جاري الحذف..." : "حذف"}
              </button>
              <button 
                onClick={() => setOrderToDelete(null)} 
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
