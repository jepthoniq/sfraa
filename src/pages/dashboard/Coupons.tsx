import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Coupon } from "../../types";
import { Ticket, Plus, Trash2, Calendar, Users, Percent, CheckCircle2, XCircle } from "lucide-react";

export default function Coupons({ restaurantId }: { restaurantId?: string }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    code: "",
    discountPercentage: "",
    expiryDate: "",
    usageLimit: "",
    usageLimitPerUser: "1",
    isFirstOrderOnly: false
  });

  const fetchCoupons = async () => {
    if (!restaurantId) return;
    try {
      const data = await api.get(`/api/restaurants/${restaurantId}/coupons`);
      // Adapt from snake_case if necessary, though server route should handle mapping if we used a clean SELECT
      // Based on db.exec, we have snake_case names in DB. 
      // Let's check how server returns them. 
      // The server returns rows as is from db.prepare("SELECT * FROM coupons ...").all()
      // So it will be snake_case. Let's map them to camelCase.
      const camelData = data.map((c: any) => ({
        id: c.id,
        code: c.code,
        discountPercentage: c.discount_percentage,
        expiryDate: c.expiry_date,
        usageLimit: c.usage_limit,
        usageLimitPerUser: c.usage_limit_per_user,
        usageCount: c.usage_count,
        isActive: !!c.is_active,
        isFirstOrderOnly: !!c.is_first_order_only
      }));
      setCoupons(camelData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [restaurantId]);

  const addCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !formData.code || !formData.discountPercentage) return;

    setSaving(true);
    try {
      await api.post(`/api/restaurants/${restaurantId}/coupons`, {
        code: formData.code.toUpperCase(),
        discountPercentage: Number(formData.discountPercentage),
        expiryDate: formData.expiryDate || null,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        usageLimitPerUser: formData.usageLimitPerUser ? Number(formData.usageLimitPerUser) : 1,
        isFirstOrderOnly: formData.isFirstOrderOnly
      });
      setFormData({
        code: "",
        discountPercentage: "",
        expiryDate: "",
        usageLimit: "",
        usageLimitPerUser: "1",
        isFirstOrderOnly: false
      });
      fetchCoupons();
    } catch (error) {
      console.error("Error adding coupon:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكود؟")) return;
    try {
      await api.delete(`/api/coupons/${id}`);
      fetchCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">نظام الخصومات</h1>
        <p className="text-gray-500">أنشئ أكواد خصم لجذب الزبائن وزيادة المبيعات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Coupon Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-4">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-600" />
              إنشاء كود خصم جديد
            </h3>
            <form onSubmit={addCoupon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كود الخصم</label>
                <input 
                  type="text" 
                  placeholder="مثلاً: SAVE20، WELCOME..." 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 font-mono"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم (%)</label>
                <input 
                  type="number" 
                  placeholder="20" 
                  max="100"
                  min="1"
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({...formData, discountPercentage: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء (اختياري)</label>
                <input 
                  type="date" 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للاستخدام (كلياً - اختياري)</label>
                <input 
                  type="number" 
                  placeholder="مثلاً: 100 مرة" 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى لكل مستخدم</label>
                <input 
                  type="number" 
                  placeholder="مثلاً: 1 مرة واحدة" 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                  value={formData.usageLimitPerUser}
                  onChange={(e) => setFormData({...formData, usageLimitPerUser: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  id="firstOrderOnly"
                  className="w-5 h-5 text-red-600 rounded-lg focus:ring-red-500"
                  checked={formData.isFirstOrderOnly}
                  onChange={(e) => setFormData({...formData, isFirstOrderOnly: e.target.checked})}
                />
                <label htmlFor="firstOrderOnly" className="text-sm font-medium text-gray-700 cursor-pointer">للطلب الأول فقط</label>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "إنشاء الكود"}
              </button>
            </form>
          </div>
        </div>

        {/* Coupons List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">أكواد الخصم الحالية</h3>
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                {coupons.length} كود
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                 <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
              ) : coupons.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Ticket className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>لم يتم إنشاء أي أكواد خصم بعد</p>
                </div>
              ) : (
                coupons.map(coupon => (
                  <div key={coupon.id} className="p-6 hover:bg-gray-50 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold font-mono">
                          <Ticket className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xl text-gray-900 tracking-wider font-mono">{coupon.code}</h4>
                          <div className="flex items-center gap-3 mt-1">
                             <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                               <Percent className="w-3 h-3" />
                               خصم {coupon.discountPercentage}%
                             </div>
                             {coupon.isActive ? (
                               <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                                 <CheckCircle2 className="w-3 h-3" /> فعال
                               </span>
                             ) : (
                               <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-full">
                                 <XCircle className="w-3 h-3" /> غير فعال
                               </span>
                             )}
                             {coupon.isFirstOrderOnly && (
                               <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                 للطلب الأول فقط
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteCoupon(coupon.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">الاستخدام: <span className="font-bold text-gray-900">{coupon.usageCount}</span> {coupon.usageLimit ? `/ ${coupon.usageLimit}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">لكل مستخدم: <span className="font-bold text-gray-900">{coupon.usageLimitPerUser || 1}</span></span>
                      </div>
                      {coupon.expiryDate && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">ينتهي في: <span className="font-bold text-gray-900">{new Date(coupon.expiryDate).toLocaleDateString('ar-IQ')}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
