import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import RedefinirSenha from './pages/RedefinirSenha';
import Pets from './pages/MeusPets'
//import Vacinas from './pages/Vacinas'
//import Consultas from './pages/Consultas'
//import Produtos from './pages/Produtos'

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
    const tutorData = localStorage.getItem('tutor');
    const tutorDataSession = sessionStorage.getItem('tutor');
    return (tutorData || tutorDataSession)  ? <>{children}</> : <Navigate to="/login"/>;
}

export const AppRoutes = () => {

    return(
        <Routes>
            <Route path='*' element={<Navigate to='/'/>}/>
            <Route path='/login' element={<Login />}/>
            <Route path='/redefinir-senha' element={<RedefinirSenha />} />
            <Route path='/home' element={<PrivateRoute><Home /></PrivateRoute>}/>
            <Route path='/' element={<PrivateRoute><Navigate to='/home'/></PrivateRoute>}/>
            <Route path='/pets' element={<PrivateRoute><Pets /></PrivateRoute>}/>
        </Routes>

    )

}


 //               <Route path='/vacinas' element={<Vacinas />}/>
   //             <Route path='/consultas' element={<Consultas />}/>
     //           <Route path='/produtos' element={<Produtos />}/>
