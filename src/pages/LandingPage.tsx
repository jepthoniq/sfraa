import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { io } from "socket.io-client";
import { 
  QrCode, 
  Truck, 
  Utensils, 
  BarChart3, 
  ChevronLeft, 
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  MessageCircle,
  Smartphone,
  LogOut,
  User,
  Megaphone,
  X
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const savedUser = localStorage.getItem("sufra_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sufra_token");
    localStorage.removeItem("sufra_user");
    setUser(null);
  };

  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"manager" | "customer">("customer");
  
  // Coupon Notification State
  const [globalCoupon, setGlobalCoupon] = React.useState<any>(null);
  const couponAudioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    const socket = io(window.location.origin);
    
    socket.on("global-coupon-alert", (data) => {
      setGlobalCoupon(data);
      if (couponAudioRef.current) {
        couponAudioRef.current.play().catch(e => console.log("Audio play error:", e));
      }
      // Auto-hide after 15 seconds
      setTimeout(() => setGlobalCoupon(null), 15000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Management State
  const [email, setEmail] = React.useState(localStorage.getItem("remembered_email") || "");
  const [password, setPassword] = React.useState(localStorage.getItem("remembered_password") || "");
  const [rememberMe, setRememberMe] = React.useState(true);
  
  // Customer State
  const [phone, setPhone] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/customer-send-otp", { phone });
      setOtpSent(true);
    } catch (error: any) {
      setError(error.response?.data?.error || "حدث خطأ أثناء إرسال الكود");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await api.post("/api/auth/customer-verify-otp", { phone, code: otpCode });
      
      localStorage.setItem("sufra_token", token);
      localStorage.setItem("sufra_user", JSON.stringify(user));
      
      // For customers, we can stay on landing page or redirect to a profile/orders view
      // For now, let's refresh or show success
      setShowLoginModal(false);
      window.location.reload(); 
    } catch (error: any) {
      setError(error.response?.data?.error || "كود التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await api.post("/api/auth/login", { email, password });
      
      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
        localStorage.setItem("remembered_password", password);
      } else {
        localStorage.removeItem("remembered_email");
        localStorage.removeItem("remembered_password");
      }

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
      {/* Login Modal */}
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
              <div className="flex p-1 bg-gray-50 rounded-2xl mb-8">
                <button 
                  onClick={() => { setActiveTab("customer"); setError(null); }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === "customer" ? "bg-white text-red-600 shadow-sm" : "text-gray-400"}`}
                >
                  <Smartphone className="w-4 h-4" />
                  تسجيل زبون
                </button>
                <button 
                  onClick={() => { setActiveTab("manager"); setError(null); }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === "manager" ? "bg-white text-red-600 shadow-sm" : "text-gray-400"}`}
                >
                  <Utensils className="w-4 h-4" />
                  إدارة المطعم
                </button>
              </div>

              <h2 className="text-3xl font-black mb-2">
                {activeTab === "customer" ? "مرحباً بالزبون" : "دخول الإدارة"}
              </h2>
              <p className="text-gray-500 mb-8">
                {activeTab === "customer" ? "سجل برقم هاتفك لمتابعة طلباتك" : "أدخل بياناتك للوصول للوحة التحكم"}
              </p>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                  {error}
                </div>
              )}
              
              {activeTab === "customer" ? (
                <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-6">
                  {!otpSent ? (
                    <div>
                      <label className="block text-sm font-bold mb-2 mr-1">رقم الهاتف</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-medium text-left"
                        placeholder="07XXXXXXXX"
                        style={{ direction: 'ltr' }}
                        required
                        disabled={loading}
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-2 mr-1">
                        <label className="block text-sm font-bold">كود التحقق</label>
                        <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-red-600 font-bold">تغيير الرقم</button>
                      </div>
                      <input 
                        type="text" 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-red-600 focus:bg-white rounded-2xl outline-none transition-all font-black text-center tracking-[1em]"
                        placeholder="000000"
                        maxLength={6}
                        required
                        autoFocus
                        disabled={loading}
                      />
                      <p className="text-[10px] text-gray-400 mt-2 text-center">أدخل الكود المرسل لـ WhatsApp (التجريبي: 121212)</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-3"
                  >
                    {loading ? "جاري المعالجة..." : (otpSent ? "تأكيد الكود" : "إرسال كود التحقق")}
                    {!loading && <MessageCircle className="w-5 h-5" />}
                  </button>
                </form>
              ) : (
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

                  <div className="flex items-center gap-3 px-2">
                    <input 
                      type="checkbox" 
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-5 h-5 accent-red-600 rounded-lg cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-sm font-bold text-gray-600 cursor-pointer">تذكر بيانات الدخول</label>
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
              )}
              
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

      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">ز</div>
          <span className="text-2xl font-bold tracking-tight">زانتكس للمطاعم</span>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-gray-900">{user.name || user.phone}</span>
                <span className="text-[10px] text-gray-400 capitalize">{user.role === 'manager' ? 'إدارة' : 'زبون'}</span>
              </div>
              <div className="flex gap-2">
                {user.role === 'manager' && (
                  <button 
                    onClick={() => navigate("/dashboard")}
                    className="bg-gray-100 text-gray-900 px-4 py-2 rounded-full font-bold text-xs hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    لوحة التحكم
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold text-xs hover:bg-red-100 transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  خروج
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-black transition-all"
            >
              ابدأ الآن مجاناً
            </button>
          )}
        </div>
      </nav>

      {/* Notification UI */}
      <audio ref={couponAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
      
      <AnimatePresence>
        {globalCoupon && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-6 right-6 z-[100] w-full max-w-sm"
          >
            <div className="bg-white rounded-[2rem] shadow-2xl border border-red-50 p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600" />
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Megaphone className="w-6 h-6 animate-bounce" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-black text-gray-900 leading-tight">عرض جديد من {globalCoupon.restaurantName}!</h4>
                    <button onClick={() => setGlobalCoupon(null)} className="text-gray-300 hover:text-gray-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mb-4 font-medium">استخدم كود الخصم التالي للحصول على خصم <span className="text-red-600 font-bold">{globalCoupon.discountPercentage}%</span></p>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2 font-mono font-black text-center tracking-widest text-lg">
                      {globalCoupon.code}
                    </div>
                    <button 
                      onClick={() => {
                        navigate(`/menu/${globalCoupon.slug}`);
                        setGlobalCoupon(null);
                      }}
                      className="bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                    >
                      اطلب الآن
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
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
              {/* Floating elements */}
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

      {/* Features */}
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

      {/* Pricing/CTA */}
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
            {/* Decorative circles */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600 rounded-full opacity-20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600 rounded-full opacity-20 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Footer */}
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
