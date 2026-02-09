import Cookies from 'js-cookie';

interface StorageHandler {
  set: (key: string, value: any) => void;
  get: (key: string) => any;
  remove: (key: string) => void;
}

const storage: StorageHandler = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      Cookies.set(key, JSON.stringify(value));
    }
  },
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return Cookies.get(key) ? JSON.parse(Cookies.get(key) as string) : null;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      Cookies.remove(key);
    }
  }
};


export default storage;