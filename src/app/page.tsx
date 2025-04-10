// src/app/page.tsx
import Link from 'next/link';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">Добро пожаловать в todoProject</h1>
      <p className="mb-6">Это базовый проект для создания To-Do List с аутентификацией.</p>
      <Link href="/login">
        <span className="text-blue-500 underline cursor-pointer">
          Перейти на страницу входа
        </span>
      </Link>
    </div>
  );
}
export default Home