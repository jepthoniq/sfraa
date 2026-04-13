import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Order } from "../../types";
import { formatCurrency } from "../../lib/utils";
import { 
  TrendingUp, 
  ShoppingBag, 
  Truck, 
  Users, 
  DollarSign,
  MapPin
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function Analytics({ restaurantId }: { restaurantId?: string }) {
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchStats = async () => {
      try {
        const data = await api.get(`/api/restaurants/${restaurantId}/analytics`);
        setStatsData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [restaurantId]);

  if (loading || !statsData) return <div className="flex items-center justify-center h-64">جاري تحميل الإحصائيات...</div>;

  const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"];

  const stats = [
    { name: "إجمالي الإيرادات", value: formatCurrency(statsData.totalRevenue), icon: DollarSign, color: "bg-green-50 text-green-600" },
    { name: "عدد الطلبات", value: statsData.orderCount, icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
    { name: "طلبات التوصيل", value: statsData.deliveryCount, icon: Truck, color: "bg-purple-50 text-purple-600" },
    { name: "إيرادات التوصيل", value: formatCurrency(statsData.deliveryRevenue), icon: TrendingUp, color: "bg-red-50 text-red-600" },
  ];

  const typeData = [
    { name: "توصيل", value: statsData.deliveryCount },
    { name: "داخل المطعم", value: statsData.orderCount - statsData.deliveryCount }
  ];

  const zoneData = statsData.zoneData || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإحصائيات والتقارير</h1>
        <p className="text-gray-500">نظرة شاملة على أداء مطعمك ونمو المبيعات</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-500 font-medium">{stat.name}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Zone Analytics */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            المناطق الأكثر طلباً
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 8, 8, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Types */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-red-600" />
            توزيع أنواع الطلبات
          </h3>
          <div className="h-80 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4 pr-8">
              {typeData.map((entry, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div>
                    <p className="text-xs text-gray-500">{entry.name}</p>
                    <p className="font-bold text-gray-900">{entry.value} طلب</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
