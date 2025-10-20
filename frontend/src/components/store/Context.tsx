import { createContext } from "react";

interface StoreContextType {
  token: string | null;
  setToken: (token: string) => void;
  cpf: string | null;
  setCpf: (cpf: string) => void;
  nome: string | null;
  setNome: (nome: string) => void;
  
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);


export default StoreContext;