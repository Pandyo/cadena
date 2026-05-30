import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import api from "../api/client";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      setUser(null);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask를 설치해주세요!");
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0].toLowerCase();

      const nonceRes = await api.get(`/auth/nonce/${address}`);
      const { nonce } = nonceRes.data;

      const signer = await provider.getSigner();
      const message = `Cadena 로그인 인증\nNonce: ${nonce}`;
      const signature = await signer.signMessage(message);

      const verifyRes = await api.post("/auth/verify", { address, signature });
      localStorage.setItem("cadana_token", verifyRes.data.token);
      setAccount(address);
      setUser(verifyRes.data.user);
    } catch (err) {
      console.error("Login error:", err);
      alert("로그인 실패: " + (err.message || "알 수 없는 오류"));
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem("cadana_token");
    setAccount(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("cadana_token");
    if (token) fetchUser();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) disconnect();
      });
    }
  }, [fetchUser, disconnect]);

  return (
    <WalletContext.Provider value={{ account, user, loading, connect, disconnect, fetchUser }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
