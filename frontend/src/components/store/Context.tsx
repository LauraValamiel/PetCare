import { createContext } from "react";

interface StoreContextType {
  token: string | null;
  setToken: (token: string) => void;
  cpf: string | null;
  setCpf: (cpf: string) => void;
  nome: string | null;
  setNome: (nome: string) => void;
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;

  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (isOpen: boolean) => void;

  isProfileOpen: boolean;
  setIsProfileOpen: (isOpen: boolean) => void;

  fotoPerfilTutor: string | null;
  setFotoPerfilTutor: (foto: string | null) => void;
  
}

export interface NotificationItem {
  type: 'vacina' | 'consulta' | 'produto';
  title: string;
  subtitle: string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);


export default StoreContext;