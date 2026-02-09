import { AppRoutes } from './routes'
import StoreProvider from './components/store/Provider'

function App() {

  return (
    <StoreProvider>
      <AppRoutes />
    </StoreProvider>
  )
}

export default App
