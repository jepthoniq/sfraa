import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Plus, Trash2, Mail, User, Calendar, X } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  name: string;
  created_at: string;
  is_super_admin: number;
  restaurant_id: string | null;
  restaurant_name: string | null;
  slug: string | null;
}

export default function SubscriberManagement() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [adding, setAdding] = useState(false);

  const fetchSubscribers = async () => {
    try {
      const data = await api.get("/api/admin/users");
      setSubscribers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post("/api/admin/users", newUser);
      setNewUser({ name: "", email: "", password: "" });
      setShowAddModal(false);
      fetchSubscribers();
      alert("تمت إضافة المشترك بنجاح");
    } catch (err: any) {
      alert(err.message || "حدث خطأ");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المشترك وجميع بيانات مطعمه؟")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      fetchSubscribers();
    } catch (err) {
      alert("فشل الحذف");
    }
  };

  if (loading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المشتركين</h1>
          <p className="text-gray-500">جميع حسابات المطاعم المسجلة في المنصة</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          مشترك جديد
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-black text-gray-600">الاسم</th>
                <th className="px-6 py-4 text-sm font-black text-gray-600">البريد الإلكتروني</th>
                <th className="px-6 py-4 text-sm font-black text-gray-600">المطعم</th>
                <th className="px-6 py-4 text-sm font-black text-gray-600">تاريخ التسجيل</th>
                <th className="px-6 py-4 text-sm font-black text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4 font-bold text-gray-900">{sub.name}</td>
                  <td className="px-6 py-4 text-gray-600">{sub.email}</td>
                  <td className="px-6 py-4">
                    {sub.restaurant_name ? (
                      <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        {sub.restaurant_name}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">لا يوجد مطعم</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(sub.created_at).toLocaleDateString("ar-IQ")}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">إضافة مشترك جديد</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-500 mb-6">سيتم إنشاء مطعم افتراضي له تلقائياً</p>
            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  className="w-full px-5 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-600 outline-none"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  className="w-full px-5 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-600 outline-none"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">كلمة المرور</label>
                <input
                  type="password"
                  className="w-full px-5 py-3 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-600 outline-none"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all"
                >
                  {adding ? "جاري الإضافة..." : "إضافة"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}