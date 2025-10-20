import React, { type ReactNode } from 'react';
import StoreContext from './Context.tsx';
import useStorage from '../utils/useStorage';

interface StoreProviderProps {
  children: ReactNode;
}

const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [token, setToken] = useStorage("token", null);
  const [cpf, setCpf] = useStorage("cpf", null);
  const [nome, setNome] = useStorage("nome", null);

  return (
    <StoreContext.Provider
      value={{
        token,
        setToken,
        cpf,
        setCpf,
        nome,
        setNome,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}


export default StoreProvider;