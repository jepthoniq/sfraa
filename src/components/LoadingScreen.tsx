import React from "react";
import { motion } from "motion/react";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
          borderRadius: ["20%", "50%", "20%"]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-16 h-16 bg-red-600 shadow-xl shadow-red-100"
      />
    </div>
  );
}
