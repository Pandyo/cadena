import { ImageWithFallback } from './figma/ImageWithFallback';
import logoImage from '@/imports/image-4.png';
import { Wallet, Bell, Settings } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src={logoImage}
              alt="Cadena Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 transition-all flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>MetaMask 연결</span>
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
