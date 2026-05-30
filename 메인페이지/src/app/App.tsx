import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  return (
    <>
      {isConnected ? (
        <Dashboard onDisconnect={handleDisconnect} />
      ) : (
        <LandingPage onConnect={handleConnect} />
      )}
    </>
  );
}