import { createContext } from "react";
import type { Tutor } from "../../pages/MeusPets";

export interface Notificacao {
  id: string | number;
  titulo: string;
  mensagem: string;
  tipo: 'vacina' | 'consulta' | 'alerta' | 'produto';
  data: string;
  lida: boolean;
}

interface StoreContextType {
  token: string | null;
  setToken: (token: string) => void;

  cpf: string | null;
  setCpf: (cpf: string) => void;

  nome: string | null;
  setNome: (nome: string) => void;

  notificacoes: Notificacao[];
  setNotificacoes: React.Dispatch<React.SetStateAction<Notificacao[]>>;
  carregarNotificacoes: () => void;
  limparNotificacoes: () => void;

  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (isOpen: boolean) => void;

  isProfileOpen: boolean;
  setIsProfileOpen: (isOpen: boolean) => void;

  fotoPerfilTutor: string | null;
  setFotoPerfilTutor: (foto: string | null) => void;
  
  tutor: Tutor | null;
  setTutor: (tutor: Tutor | null) => void;

}

const StoreContext = createContext<StoreContextType>({
    token: null,
    setToken: () => {},

    cpf: null,
    setCpf: () => {},

    nome: null,
    setNome: () => {},

    notificacoes: [],
    setNotificacoes: () => {},
    carregarNotificacoes: () => {},
    limparNotificacoes: () => {},

    isNotificationsOpen: false,
    setIsNotificationsOpen: () => {},

    isProfileOpen: false,
    setIsProfileOpen: () => {},

    fotoPerfilTutor: null,
    setFotoPerfilTutor: () => {},

    tutor: null,
    setTutor: () => {},
});


export default StoreContext;