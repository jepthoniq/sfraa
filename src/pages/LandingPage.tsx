import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { 
  QrCode, 
  Truck, 
  Utensils, 
  BarChart3, 
  ChevronLeft, 
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("sufra_token", token);
      localStorage.setItem("sufra_user", JSON.stringify(user));
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError("حدث خطأ أثناء تسجيل الدخول. يرجى التأكد من البيانات والمحاولة مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900" dir="rtl">
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 lg:p-10 relative z-10 shadow-2xl"
            >
              <h2 className="text-3xl font-black mb-2">مرحباً بك في زانتكس</h2>
              <p className="text-gray-500 mb-8">سجل دخولك للبدء في إدارة مطعمك</p>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 mr-1">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 mr-1">كلمة المرور</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-3"
                >
                  {loading ? "جاري الدخول..." : "دخول إلى لوحة التحكم"}
                  {!loading && <ArrowRight className="w-5 h-5 rotate-180" />}
                </button>
              </form>
              
              <button 
                onClick={() => setShowLoginModal(false)}
                className="mt-6 w-full text-gray-400 text-sm font-medium hover:text-gray-600 transition-all"
              >
                إلغاء
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">ز</div>
          <span className="text-2xl font-bold tracking-tight">زانتكس للمطاعم</span>
        </div>
        <button 
          onClick={() => setShowLoginModal(true)}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-black transition-all"
        >
          ابدأ الآن مجاناً
        </button>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-6">
            حوّل مطعمك إلى <span className="text-red-600">نظام ذكي</span> في دقائق
          </h1>
          <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-lg">
            منيو QR احترافي، نظام توصيل متطور، وإدارة كاملة لطلباتك في منصة واحدة مصممة خصيصاً للسوق العراقي.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-red-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-3"
            >
              ابدأ تجربتك المجانية
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 px-6 py-5">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {[1,2,3].map(i => (
                  <img key={i} src={`https://picsum.photos/seed/user${i}/100/100`} className="w-10 h-10 rounded-full border-2 border-white" referrerPolicy="no-referrer" />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-500">+100 مطعم مشترك</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="bg-red-50 rounded-[3rem] p-8 aspect-square flex items-center justify-center">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-6 w-full max-w-xs relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-red-600 rounded-lg" />
                <div className="h-4 w-24 bg-gray-100 rounded-full" />
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-50 rounded-2xl" />
                <div className="h-4 w-full bg-gray-100 rounded-full" />
                <div className="h-4 w-2/3 bg-gray-100 rounded-full" />
                <div className="pt-4 flex justify-between items-center">
                  <div className="h-8 w-20 bg-red-600 rounded-lg" />
                  <div className="h-8 w-8 bg-gray-100 rounded-lg" />
                </div>
              </div>
              <div className="absolute top-1/4 -right-12 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">طلب جديد</p>
                  <p className="text-xs font-bold">توصيل للمنصور</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="bg-gray-50 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">كل ما تحتاجه للنمو</h2>
            <p className="text-gray-500">مميزات صُممت لزيادة مبيعاتك وتسهيل عملك</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "منيو QR ذكي", desc: "منيو تفاعلي يتيح للزبائن الطلب مباشرة من الطاولة دون انتظار.", icon: QrCode },
              { title: "نظام توصيل متطور", desc: "حدد مناطق التوصيل وأجورها بدقة، مع تتبع كامل للطلبات.", icon: Truck },
              { title: "إحصائيات دقيقة", desc: "اعرف أكثر الوجبات مبيعاً وأوقات الذروة لزيادة أرباحك.", icon: BarChart3 },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-red-600 group-hover:text-white transition-all">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gray-900 rounded-[3rem] p-12 lg:p-20 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">جاهز لتطوير مطعمك؟</h2>
              <p className="text-gray-400 text-lg mb-12">اشترك الآن واحصل على 14 يوم تجربة مجانية بكامل المميزات.</p>
              <button 
                onClick={() => setShowLoginModal(true)}
                className="bg-white text-gray-900 px-12 py-5 rounded-2xl font-bold text-xl hover:bg-gray-100 transition-all"
              >
                ابدأ الآن مجاناً
              </button>
            </div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600 rounded-full opacity-20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600 rounded-full opacity-20 blur-3xl" />
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">ز</div>
            <span className="text-xl font-bold">زانتكس للمطاعم</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-gray-400 text-sm">© 2024 زانتكس للمطاعم. جميع الحقوق محفوظة.</p>
            <p className="text-red-600 text-xs font-bold mt-1">حقوق الملكية: حسين علي الجبوري</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-red-600 transition-all">شروط الخدمة</a>
            <a href="#" className="text-gray-400 hover:text-red-600 transition-all">سياسة الخصوصية</a>
          </div>
        </div>
      </footer>
    </div>
  );
}