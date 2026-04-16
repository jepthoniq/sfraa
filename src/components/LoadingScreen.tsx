import React from "react";
import { motion } from "motion/react";

interface LoadingScreenProps {
  logo?: string;
  restaurantName?: string;
}

export default function LoadingScreen({ logo, restaurantName }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        {/* Animated Background Rings */}
        <motion.div
          animate={{
            scale: [1, 1.6],
            opacity: [0.2, 0],
            rotate: 360,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute w-32 h-32 border-2 border-red-500 rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.4],
            opacity: [0.3, 0],
            rotate: -360,
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute w-28 h-28 border-2 border-dashed border-red-400 rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.2],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute w-24 h-24 bg-red-50 rounded-full"
        />

        {/* Logo Container */}
        <motion.div
          animate={{ 
            y: [0, -8, 0],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center overflow-hidden border-4 border-white z-10"
        >
          {logo ? (
            <img 
              src={logo} 
              alt={restaurantName || "Loading..."} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-red-600 flex items-center justify-center text-white font-black text-5xl">
              {restaurantName ? restaurantName.charAt(0) : "ز"}
            </div>
          )}
        </motion.div>
      </div>

      {/* Text and Indicator */}
      <div className="mt-12 text-center">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-black text-gray-900 mb-4 tracking-tight"
        >
          {restaurantName || "جارٍ التحميل..."}
        </motion.h2>
        
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -6, 0],
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
              className="w-2 h-2 bg-red-600 rounded-full"
            />
          ))}
        </div>
        <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
          جاري التحميل
        </p>
      </div>
    </div>
  );
}
