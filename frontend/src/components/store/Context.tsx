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
  
}

export interface NotificationItem {
  type: 'vacina' | 'consulta' | 'produto';
  title: string;
  subtitle: string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);


export default StoreContext;