import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { formatCurrency, cn } from "../../lib/utils";
import { RefreshCw, Trash2 } from "lucide-react";

interface AdminRestaurant {
  id: string;
  name: string;
  ownerEmail: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
}

export default function RestaurantManagement() {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await api.get("/api/admin/restaurants");
      setRestaurants(data);
    } catch (e) {
      console.error(e);
      alert("فشل تحميل المطاعم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateSubscription = async (id: string, duration: string) => {
    try {
      await api.post(`/api/admin/restaurants/${id}/subscription`, { duration });
      fetchData();
      alert("تم تحديث الاشتراك بنجاح");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تحديث الاشتراك");
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

  if (loading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
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
                    <button onClick={() => updateSubscription(r.id, 'day')} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      يومي
                    </button>
                    <button onClick={() => updateSubscription(r.id, 'week')} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      أسبوعي
                    </button>
                    <button onClick={() => updateSubscription(r.id, 'month')} className="text-[10px] font-bold bg-red-600 text-white px-3 py-2 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      شهري
                    </button>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <button onClick={() => deleteRestaurant(r.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="حذف المطعم">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}