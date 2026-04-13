import React, { useState } from "react";
import { api } from "../../lib/api";
import { Restaurant } from "../../types";
import { QRCodeSVG } from "qrcode.react";
import { 
  QrCode, 
  Save, 
  Globe, 
  Smartphone, 
  DollarSign, 
  Download,
  Copy,
  Check,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "../../lib/utils";

export default function DashboardSettings({ restaurant }: { restaurant: Restaurant | null }) {
  const [formData, setFormData] = useState({
    name: restaurant?.name || "",
    slug: restaurant?.slug || "",
    minOrder: restaurant?.minOrder || 0,
    isDeliveryEnabled: restaurant?.isDeliveryEnabled ?? true,
    whatsappNumber: restaurant?.whatsappNumber || "",
    logo: restaurant?.logo || ""
  });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFormData({ ...formData, logo: base64 });
      } catch (error) {
        console.error("Error converting logo:", error);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setSaving(true);
    try {
      await api.put("/api/restaurants/me", formData);
      alert("تم حفظ الإعدادات بنجاح");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const menuUrl = `${window.location.origin}/r/${restaurant?.slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${restaurant?.slug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إعدادات المطعم</h1>
        <p className="text-gray-500">تحكم في هوية مطعمك وإعدادات التوصيل والمنيو</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-red-600" />
            المعلومات الأساسية
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المطعم</label>
              <input 
                type="text" 
                className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رابط المنيو (Slug)</label>
              <div className="flex items-center bg-gray-50 rounded-xl px-4">
                <span className="text-gray-400 text-sm ltr">/r/</span>
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border-none py-3 px-1 focus:ring-0 ltr"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">لوغو المطعم</label>
              <div className="flex gap-4 items-center">
                {formData.logo && (
                  <img src={formData.logo} alt="Logo Preview" className="w-16 h-16 rounded-full object-cover border border-gray-100" referrerPolicy="no-referrer" />
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-4 px-4 text-center text-gray-500 hover:border-red-300 hover:text-red-500 transition-all">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-xs font-bold">اختر صورة الشعار</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الواتساب (لإرسال الطلبات)</label>
              <input 
                type="text" 
                placeholder="مثال: 9647701234567"
                className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}
              />
              <p className="text-[10px] text-gray-400 mt-1">أدخل الرقم مع رمز الدولة بدون (+) ليتمكن الزبائن من إرسال طلباتهم عبر الواتساب.</p>
            </div>
            <div className="pt-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">إعدادات التوصيل</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-700">تفعيل خدمة التوصيل</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isDeliveryEnabled: !formData.isDeliveryEnabled})}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.isDeliveryEnabled ? "bg-red-600" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    formData.isDeliveryEnabled ? "right-7" : "right-1"
                  )} />
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  الحد الأدنى للطلب (د.ع)
                </label>
                <input 
                  type="number" 
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({...formData, minOrder: Number(e.target.value)})}
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={saving}
              className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl mt-6 hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        </div>

        {/* QR Code Section */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 self-start">
              <QrCode className="w-5 h-5 text-red-600" />
              رمز QR للمنيو
            </h3>
            <div className="bg-gray-50 p-8 rounded-3xl mb-6">
              <QRCodeSVG 
                id="qr-code"
                value={menuUrl} 
                size={200} 
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-gray-500 mb-6">اطبع هذا الرمز وضعه على الطاولات ليتمكن الزبائن من مسحه والطلب مباشرة</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={downloadQR}
                className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                <Download className="w-5 h-5" />
                تحميل QR
              </button>
              <button 
                onClick={copyToClipboard}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                {copied ? "تم النسخ" : "نسخ الرابط"}
              </button>
            </div>
          </div>

          <div className="bg-red-600 p-8 rounded-3xl shadow-xl shadow-red-100 text-white">
            <h3 className="text-lg font-bold mb-2">نصيحة احترافية 💡</h3>
            <p className="text-red-100 text-sm leading-relaxed">
              قم بتصميم ملصقات جذابة تحتوي على رمز QR الخاص بمطعمك. يمكنك إضافة عبارة "امسح واطلب وجبتك المفضلة" لتشجيع الزبائن على استخدام النظام.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
