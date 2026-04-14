import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { DeliveryZone } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { MapPin, Plus, Trash2, Map as MapIcon } from "lucide-react";

export default function Zones({ restaurantId }: { restaurantId?: string }) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneFee, setNewZoneFee] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchZones = async () => {
    if (!restaurantId) return;
    try {
      const data = await api.get(`/api/restaurants/${restaurantId}/zones`);
      setZones(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, [restaurantId]);

  const addZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !newZoneName || !newZoneFee) return;

    try {
      await api.post(`/api/restaurants/${restaurantId}/zones`, {
        name: newZoneName,
        fee: Number(newZoneFee)
      });
      setNewZoneName("");
      setNewZoneFee("");
      fetchZones();
    } catch (error) {
      console.error("Error adding zone:", error);
      alert("حدث خطأ أثناء إضافة المنطقة");
    }
  };

  const deleteZone = async (id: string) => {
    if (!restaurantId) return;
    try {
      await api.delete(`/api/zones/${id}`);
      fetchZones();
    } catch (error) {
      console.error("Error deleting zone:", error);
      alert("حدث خطأ أثناء حذف المنطقة");
    }
  };

  if (loading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">مناطق التوصيل</h1>
        <p className="text-gray-500">حدد المناطق التي يغطيها المطعم وأجور التوصيل لكل منها</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-600" />
              إضافة منطقة جديدة
            </h3>
            <form onSubmit={addZone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنطقة</label>
                <input 
                  type="text" 
                  placeholder="مثلاً: الكرادة، المنصور..." 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">أجور التوصيل (د.ع)</label>
                <input 
                  type="number" 
                  placeholder="5000" 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                  value={newZoneFee}
                  onChange={(e) => setNewZoneFee(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                إضافة المنطقة
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">المناطق المضافة</h3>
              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                {zones.length} منطقة
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {zones.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>لم يتم إضافة أي مناطق بعد</p>
                </div>
              ) : (
                zones.map(zone => (
                  <div key={zone.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{zone.name}</h4>
                        <p className="text-sm text-gray-500">أجور التوصيل: {formatCurrency(zone.fee)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteZone(zone.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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