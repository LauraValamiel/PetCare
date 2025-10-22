import React, { useState, type ReactNode } from 'react';
import StoreContext, { type NotificationItem } from './Context.tsx';
import useStorage from '../utils/useStorage';

interface StoreProviderProps {
  children: ReactNode;
}

const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [token, setToken] = useStorage("token", null);
  const [cpf, setCpf] = useStorage("cpf", null);
  const [nome, setNome] = useStorage("nome", null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  return (
    <StoreContext.Provider
      value={{
        token,
        setToken,
        cpf,
        setCpf,
        nome,
        setNome,
        notifications,
        setNotifications,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}


export default StoreProvider;