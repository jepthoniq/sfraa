import React, { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { Send, User, Store, X, MessageCircle, Ban, ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  orderId: string;
  sender: 'customer' | 'restaurant';
  text: string;
  createdAt: string;
}

interface ChatProps {
  orderId: string;
  userType: 'customer' | 'restaurant';
  onClose?: () => void;
  restaurantName?: string;
  restaurantLogo?: string;
  customerIp?: string;
  isBlocked?: boolean;
  onBlockToggle?: () => void;
}

export default function Chat({ orderId, userType, onClose, restaurantName, restaurantLogo, customerIp, isBlocked, onBlockToggle }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
  }, []);

  const fetchMessages = async () => {
    try {
      const data = await api.get(`/api/orders/${orderId}/messages`);
      if (data.length > messages.length && messages.length > 0) {
        const lastMsg = data[data.length - 1];
        if (lastMsg.sender !== userType) {
          audioRef.current?.play().catch(e => console.log("Audio play blocked"));
        }
      }
      setMessages(data);
    } catch (e) {
      console.error("Chat fetch error:", e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    // Update last read timestamp
    const key = userType === 'customer' ? `sufra_last_read_${orderId}` : `sufra_admin_last_read_${orderId}`;
    localStorage.setItem(key, Date.now().toString());
  }, [orderId, messages.length, userType]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    setLoading(true);
    try {
      const newMessage = await api.post(`/api/orders/${orderId}/messages`, {
        sender: userType,
        text: inputText.trim()
      });
      setMessages(prev => [...prev, newMessage]);
      setInputText("");
    } catch (e) {
      console.error("Chat send error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {userType === 'customer' ? (
            restaurantLogo ? (
              <img src={restaurantLogo} alt={restaurantName} className="w-10 h-10 rounded-full object-cover border-2 border-red-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white">
                <Store className="w-5 h-5" />
              </div>
            )
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-gray-900">
                {userType === 'customer' ? (restaurantName || "المطعم") : "الزبون"}
              </h3>
              {userType === 'customer' && <Store className="w-3 h-3 text-red-600" />}
            </div>
            <p className="text-[10px] text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
              متصل الآن
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {userType === 'restaurant' && customerIp && onBlockToggle && (
            <button 
              onClick={() => {
                if(confirm(isBlocked ? "هل تريد إلغاء حظر هذا الزبون؟" : "هل تريد حظر هذا الزبون؟ لن يتمكن من الطلب مجدداً.")) {
                  onBlockToggle();
                }
              }}
              className={cn(
                "p-2 rounded-xl transition-all",
                isBlocked ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-red-600 bg-red-50 hover:bg-red-100"
              )}
              title={isBlocked ? "إلغاء الحظر" : "حظر الزبون"}
            >
              <Ban className="w-5 h-5" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-all">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <MessageCircle className="w-12 h-12 opacity-20" />
            <p className="text-sm">ابدأ المحادثة الآن...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.sender === userType ? "mr-auto items-end" : "ml-auto items-start"
              )}
            >
              <div className={cn(
                "px-4 py-2 rounded-2xl text-sm shadow-sm",
                msg.sender === userType 
                  ? "bg-red-600 text-white rounded-br-none" 
                  : "bg-white text-gray-900 border border-gray-100 rounded-bl-none"
              )}>
                {msg.text}
              </div>
              <span className="text-[10px] text-gray-400 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 bg-gray-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-red-500"
          />
          <button 
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
