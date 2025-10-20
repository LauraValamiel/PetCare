//import React, { useState } from 'react'
//import { Stethoscope, ShoppingBag, Calendar, FileText, Heart, Activity } from 'lucide-react'
import './App.css'
import { AppRoutes } from './routes'
import StoreProvider from './components/store/Provider'

function App() {
  //const [activeSection, setActiveSection] = useState('home')

  return (
    <StoreProvider>
      <AppRoutes />
    </StoreProvider>
  )
}

export default App
