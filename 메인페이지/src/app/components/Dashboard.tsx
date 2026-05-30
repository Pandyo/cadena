import { Header } from './Header';

interface DashboardProps {
  onDisconnect: () => void;
}

export function Dashboard({ onDisconnect }: DashboardProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="container mx-auto px-6 py-8">
        {/* 대시보드 내용 */}
      </main>
    </div>
  );
}
