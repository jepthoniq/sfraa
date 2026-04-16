import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";
import { Restaurant } from "../types";
import { cn } from "../lib/utils";
import ErrorBoundary from "../components/ErrorBoundary";
import LoadingScreen from "../components/LoadingScreen";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  MapPin, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu as MenuIcon, 
  X,
  ClipboardList,
  Bell,
  ShieldCheck,
  Calendar
} from "lucide-react";

import Orders from "./dashboard/Orders";
import MenuManagement from "./dashboard/MenuManagement";
import Zones from "./dashboard/Zones";
import Analytics from "./dashboard/Analytics";
import DashboardSettings from "./dashboard/Settings";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("sufra_token");
    const userData = localStorage.getItem("sufra_user");
    
    if (!token || !userData) {
      navigate("/");
      return;
    }

    setUser(JSON.parse(userData));

    const fetchRestaurant = async () => {
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 10000); // 10 seconds timeout safety

      try {
        const rest = await api.get("/api/restaurants/me");
        setRestaurant(rest);
      } catch (e: any) {
        console.error("Dashboard Fetch Error:", e);
        if (e.message.includes("انتهى اشتراكك")) {
          // Handle expired subscription if needed, but for now just let it load
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [navigate]);

  useEffect(() => {
    if (!restaurant) return;

    const checkNewOrders = async () => {
      if (!restaurant?.id) return;
      try {
        const orders = await api.get(`/api/restaurants/${restaurant.id}/orders`);
        if (Array.isArray(orders)) {
          const pendingCount = orders.filter((o: any) => o.status === "pending").length;
          setNewOrdersCount(pendingCount);
        }
      } catch (e) {
        console.error("Error checking new orders:", e);
      }
    };

    checkNewOrders();
    const interval = setInterval(checkNewOrders, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [restaurant]);

  const handleLogout = () => {
    localStorage.removeItem("sufra_token");
    localStorage.removeItem("sufra_user");
    navigate("/");
  };

  const navItems = [
    { name: "الطلبات", icon: ClipboardList, path: "/dashboard" },
    { name: "إدارة المنيو", icon: UtensilsCrossed, path: "/dashboard/menu" },
    { name: "مناطق التوصيل", icon: MapPin, path: "/dashboard/zones" },
    { name: "الإحصائيات", icon: BarChart3, path: "/dashboard/analytics" },
    { name: "الإعدادات", icon: Settings, path: "/dashboard/settings" },
  ];

  if (user?.isSuperAdmin) {
    navItems.push({ name: "الإدارة العليا", icon: ShieldCheck, path: "/super-admin" });
  }

  if (loading) return <LoadingScreen logo={restaurant?.logo} restaurantName={restaurant?.name} />;

  const dashboardColor = user?.dashboardColor || "#dc2626";

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans" dir="rtl" style={{ "--dashboard-color": dashboardColor } as any}>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-gray-200 sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold" style={{ color: dashboardColor }}>زانتكس</h1>
          <p className="text-xs text-gray-500 mt-1">لوحة تحكم المطعم</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all",
                location.pathname === item.path 
                  ? "bg-[var(--dashboard-color)]/10 text-[var(--dashboard-color)]" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                {item.name}
              </div>
              {item.name === "الطلبات" && newOrdersCount > 0 && (
                <span className="bg-[var(--dashboard-color)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {newOrdersCount}
                </span>
              )}
            </Link>
          ))}

          {restaurant && (
            <div className="mt-8 px-4 py-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-900">
                <Calendar className="w-4 h-4" style={{ color: dashboardColor }} />
                <span className="text-xs font-bold">معلومات الاشتراك</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400">تاريخ البدء</p>
                  <p className="text-[10px] font-bold text-gray-700">
                    {restaurant.subscriptionStartedAt ? new Date(restaurant.subscriptionStartedAt).toLocaleDateString('ar-IQ') : 'غير متوفر'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">تاريخ الانتهاء</p>
                  <p className="text-[10px] font-bold" style={{ color: dashboardColor }}>
                    {restaurant.subscriptionExpiresAt ? new Date(restaurant.subscriptionExpiresAt).toLocaleDateString('ar-IQ') : 'غير متوفر'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="mb-4 px-4">
            <p className="text-[10px] text-gray-400">حقوق الملكية</p>
            <p className="text-[10px] font-bold" style={{ color: dashboardColor }}>حسين علي الجبوري</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-[var(--dashboard-color)]/10 hover:text-[var(--dashboard-color)] transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600">
          <MenuIcon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: dashboardColor }}>زانتكس</h1>
        <div className="relative">
          <button onClick={() => navigate("/dashboard")} className="p-2 text-gray-600">
            <Bell className="w-6 h-6" />
            {newOrdersCount > 0 && (
              <span className="absolute top-1 right-1 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white" style={{ backgroundColor: dashboardColor }}>
                {newOrdersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
            />
            <motion.aside 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed inset-y-0 right-0 w-72 bg-white z-50 lg:hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h1 className="text-2xl font-bold" style={{ color: dashboardColor }}>زانتكس</h1>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      location.pathname === item.path 
                        ? "bg-[var(--dashboard-color)]/10 text-[var(--dashboard-color)]" 
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                ))}

                {restaurant && (
                  <div className="mt-8 px-4 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-3 text-gray-900">
                      <Calendar className="w-4 h-4" style={{ color: dashboardColor }} />
                      <span className="text-xs font-bold">معلومات الاشتراك</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] text-gray-400">تاريخ البدء</p>
                        <p className="text-[10px] font-bold text-gray-700">
                          {restaurant.subscriptionStartedAt ? new Date(restaurant.subscriptionStartedAt).toLocaleDateString('ar-IQ') : 'غير متوفر'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">تاريخ الانتهاء</p>
                        <p className="text-[10px] font-bold" style={{ color: dashboardColor }}>
                          {restaurant.subscriptionExpiresAt ? new Date(restaurant.subscriptionExpiresAt).toLocaleDateString('ar-IQ') : 'غير متوفر'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all w-full"
                >
                  <LogOut className="w-5 h-5" />
                  تسجيل الخروج
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 pt-20 lg:pt-8 px-4 pb-12 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <ErrorBoundary>
            <Routes>
              <Route index element={<Orders restaurantId={restaurant?.id} />} />
              <Route path="menu" element={<MenuManagement restaurantId={restaurant?.id} />} />
              <Route path="zones" element={<Zones restaurantId={restaurant?.id} />} />
              <Route path="analytics" element={<Analytics restaurantId={restaurant?.id} />} />
              <Route path="settings" element={<DashboardSettings restaurant={restaurant} />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
