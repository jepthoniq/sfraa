import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatCurrency, cn } from "../lib/utils";
import { Users, Store, Calendar, Plus, Check, X, ShieldCheck, LogOut, ArrowRight, Trash2, RefreshCw } from "lucide-react";

import ErrorBoundary from "../components/ErrorBoundary";

interface AdminRestaurant {
  id: string;
  name: string;
  ownerEmail: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
}

export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "" });
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
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await api.get("/api/admin/restaurants");
      setRestaurants(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (id: string, duration: string) => {
    try {
      await api.post(`/api/admin/restaurants/${id}/subscription`, { duration });
      fetchData();
      alert("تم تحديث الاشتراك بنجاح");
    } catch (e) {
      console.error(e);
    }
  };

  const deleteRestaurant = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المطعم وجميع بياناته؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    try {
      await api.delete(`/api/admin/restaurants/${id}`);
      fetchData();
      alert("تم حذف المطعم بنجاح");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/users", newUser);
      setNewUser({ email: "", password: "", name: "" });
      setShowAddUser(false);
      fetchData();
      alert("تم إضافة المستخدم بنجاح");
    } catch (e: any) {
      alert(e.message || "حدث خطأ ما");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sufra_token");
    localStorage.removeItem("sufra_user");
    navigate("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans" dir="rtl">جاري التحميل...</div>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      {/* Top Bar */}
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
            <button 
              onClick={handleLogout}
              className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">إدارة الاشتراكات والمستخدمين</h2>
            <p className="text-gray-500">تحكم في جميع المطاعم المسجلة في النظام</p>
          </div>
          <button 
            onClick={() => setShowAddUser(true)}
            className="bg-red-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-100"
          >
            <Plus className="w-5 h-5" />
            إضافة مستخدم جديد
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Store className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">إجمالي المطاعم</p>
            <h3 className="text-3xl font-black text-gray-900">{restaurants.length}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6">
              <Check className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">اشتراكات نشطة</p>
            <h3 className="text-3xl font-black text-gray-900">
              {restaurants.filter(r => r.subscriptionStatus === 'active').length}
            </h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
              <X className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">اشتراكات منتهية</p>
            <h3 className="text-3xl font-black text-gray-900">
              {restaurants.filter(r => r.subscriptionStatus === 'expired' || (r.subscriptionExpiresAt && new Date(r.subscriptionExpiresAt) < new Date())).length}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-6 text-sm font-black text-gray-600">المطعم</th>
                  <th className="px-8 py-6 text-sm font-black text-gray-600">البريد الإلكتروني</th>
                  <th className="px-8 py-6 text-sm font-black text-gray-600">تاريخ الانتهاء</th>
                  <th className="px-8 py-6 text-sm font-black text-gray-600">تفعيل / تجديد الاشتراك</th>
                  <th className="px-8 py-6 text-sm font-black text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {restaurants.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-all group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-gray-900 group-hover:text-red-600 transition-colors">{r.name}</p>
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-500 font-medium">{r.ownerEmail}</td>
                    <td className="px-8 py-6">
                      {r.subscriptionExpiresAt ? (
                        <span className={cn(
                          "text-xs font-bold px-4 py-1.5 rounded-full",
                          new Date(r.subscriptionExpiresAt) < new Date() ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                        )}>
                          {new Date(r.subscriptionExpiresAt).toLocaleDateString('ar-IQ')}
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-gray-50 text-gray-400 px-4 py-1.5 rounded-full">غير محدد</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateSubscription(r.id, 'day')}
                          className="text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          يومي
                        </button>
                        <button 
                          onClick={() => updateSubscription(r.id, 'week')}
                          className="text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          أسبوعي
                        </button>
                        <button 
                          onClick={() => updateSubscription(r.id, 'month')}
                          className="text-[10px] font-bold bg-red-600 text-white px-3 py-2 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          شهري
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => deleteRestaurant(r.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="حذف المطعم"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <h2 className="text-3xl font-black mb-2">إضافة مستخدم</h2>
            <p className="text-gray-500 mb-8">قم بإنشاء حساب جديد لمدير مطعم</p>
            <form onSubmit={handleAddUser} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 mr-1">الاسم الكامل</label>
                <input 
                  type="text" 
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 mr-1">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 mr-1">كلمة المرور</label>
                <input 
                  type="password" 
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-[2] bg-red-600 text-white font-bold py-5 rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-100">إضافة المستخدم</button>
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 bg-gray-100 text-gray-500 font-bold py-5 rounded-2xl hover:bg-gray-200 transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto px-4 py-12 text-center border-t border-gray-100 mt-12">
        <p className="text-xs text-gray-400 mb-1">حقوق الملكية محفوظة</p>
        <p className="text-sm font-black text-red-600">حسين علي الجبوري</p>
      </footer>
    </div>
    </ErrorBoundary>
  );
}
