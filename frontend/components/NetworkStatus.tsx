"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [show, setShow]         = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Sync with actual browser state on mount
    setIsOnline(navigator.onLine);

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShow(true);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShow(true);
      // Auto-hide the "back online" toast after 3s
      setTimeout(() => setShow(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  const isOfflineBanner  = show && !isOnline;
  const isOnlineBanner   = show &&  isOnline && wasOffline;

  return (
    <AnimatePresence>
      {(isOfflineBanner || isOnlineBanner) && (
        <motion.div
          key={isOnline ? "online" : "offline"}
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0,  opacity: 1, scale: 1   }}
          exit={{    y: 80, opacity: 0, scale: 0.9  }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-[9999] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl font-semibold text-sm text-white select-none pointer-events-none"
          style={{
            translateX: "-50%",
            background: isOnline
              ? "linear-gradient(135deg, #16a34a, #22c55e)"
              : "linear-gradient(135deg, #dc2626, #ef4444)",
            boxShadow: isOnline
              ? "0 0 24px rgba(34,197,94,0.5), 0 4px 16px rgba(0,0,0,0.2)"
              : "0 0 24px rgba(239,68,68,0.5),  0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {isOnline ? (
            <Wifi size={16} className="flex-shrink-0" />
          ) : (
            <WifiOff size={16} className="flex-shrink-0" />
          )}
          {isOnline ? "You are back online!" : "You are offline"}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
