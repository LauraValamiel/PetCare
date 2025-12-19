import React, { useState, type ReactNode } from 'react';
import StoreContext, { type NotificationItem } from './Context.tsx';
import type { Tutor } from '../../pages/MeusPets.tsx';
import useStorage from '../utils/useStorage';

interface StoreProviderProps {
  children: ReactNode;
}

const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [token, setToken] = useStorage("token", null);
  const [tutor, setTutor] = useStorage("tutor", null);
  const [cpf, setCpf] = useStorage("cpf", null);
  const [nome, setNome] = useStorage("nome", null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [fotoPerfilTutor, setFotoPerfilTutor] = useStorage("foto_perfil_tutor", null);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <StoreContext.Provider
      value={{
        token,
        setToken,
        tutor,
        setTutor,
        cpf,
        setCpf,
        nome,
        setNome,
        notifications,
        setNotifications,
        isNotificationsOpen,
        setIsNotificationsOpen, 
        isProfileOpen,
        setIsProfileOpen,
        fotoPerfilTutor,
        setFotoPerfilTutor
     }}
    >
      {children}
    </StoreContext.Provider>
  )
}


export default StoreProvider;