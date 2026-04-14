import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { ShieldCheck, LogOut, ArrowRight, Store, Users } from "lucide-react";
import RestaurantManagement from "./dashboard/RestaurantManagement";
import SubscriberManagement from "./dashboard/SubscriberManagement";

export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"restaurants" | "subscribers">("restaurants");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sufra_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (!parsedUser.isSuperAdmin) {
        navigate("/dashboard");
        return;
      }
      setUser(parsedUser);
    } else {
      navigate("/");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sufra_token");
    localStorage.removeItem("sufra_user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-100">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">لوحة الإدارة العليا</h1>
              <p className="text-xs text-gray-500">زانتكس للمطاعم</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-bold text-gray-500 hover:text-red-600 transition-all flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" />
              العودة للمطعم
            </Link>
            <button onClick={handleLogout} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab("restaurants")}
            className={cn(
              "px-6 py-3 rounded-t-2xl font-bold text-sm transition-all flex items-center gap-2",
              activeTab === "restaurants"
                ? "bg-red-600 text-white shadow-md"
                : "text-gray-500 hover:text-red-600"
            )}
          >
            <Store className="w-4 h-4" />
            المطاعم
          </button>
          <button
            onClick={() => setActiveTab("subscribers")}
            className={cn(
              "px-6 py-3 rounded-t-2xl font-bold text-sm transition-all flex items-center gap-2",
              activeTab === "subscribers"
                ? "bg-red-600 text-white shadow-md"
                : "text-gray-500 hover:text-red-600"
            )}
          >
            <Users className="w-4 h-4" />
            المشتركين
          </button>
        </div>

        {activeTab === "restaurants" ? <RestaurantManagement /> : <SubscriberManagement />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-12 text-center border-t border-gray-100 mt-12">
        <p className="text-xs text-gray-400 mb-1">حقوق الملكية محفوظة</p>
        <p className="text-sm font-black text-red-600">حسين علي الجبوري</p>
      </footer>
    </div>
  );
}