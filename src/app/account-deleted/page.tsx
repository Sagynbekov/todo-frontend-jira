"use client";

import { FaCheckCircle, FaSignInAlt, FaUserPlus } from "react-icons/fa";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountDeleted() {
  const router = useRouter();

  // Автоматический редирект на страницу логина через 10 секунд
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <FaCheckCircle size={80} className="text-green-500 mx-auto mb-6" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Аккаунт удален</h1>
          
          <p className="text-gray-600 mb-8">
            Ваш аккаунт был успешно удален из системы. Все связанные данные также были удалены.
          </p>
          
          <div className="space-y-4">
            <Link href="/register" className="block">
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                <FaUserPlus size={18} />
                Создать новый аккаунт
              </button>
            </Link>
            
            <Link href="/login" className="block">
              <button className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                <FaSignInAlt size={18} />
                Войти в другой аккаунт
              </button>
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Вы будете автоматически перенаправлены на страницу входа через несколько секунд.
          </p>
        </div>
      </motion.div>
    </div>
  );
}