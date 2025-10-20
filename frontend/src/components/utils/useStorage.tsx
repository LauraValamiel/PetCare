import { useCallback, useEffect, useState } from 'react';
import storageModule from './storage.tsx';

export default function useStorage(key: string, p0: null) {
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : "";
  });

  /*useEffect(() => {
    const storedValue = storageModule.get(key);
    if (storedValue !== undefined && storedValue !== state) {
      setState(storedValue);
    }
  }, [key]);*/

  const set = (newValue: any) => {
    localStorage.setItem(key, JSON.stringify(newValue));
    setState(newValue);
  };

  const remove = useCallback(() => {
    localStorage.remove(key);
    setState("");
  },[key]);

  return [state, set, remove];
}