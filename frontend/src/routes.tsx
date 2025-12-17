import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import RedefinirSenha from './pages/RedefinirSenha';
import Pets from './pages/MeusPets'
import Vacinas from './pages/CartaoVacina'
import CartaoVacina from './pages/CartaoVacina';
import { ConsultasExames } from './pages/ConsultasExames';
import Produtos from './pages/Produtos'
import Perfil from './pages/Perfil';
import Configuracoes from './pages/Configuracoes';

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
            <Route path='/vacinas' element={<PrivateRoute><CartaoVacina /></PrivateRoute>}/>
            <Route path='/consultas-exames' element={<ConsultasExames />}/>
            <Route path='/produtos' element={<PrivateRoute><Produtos /></PrivateRoute>}/>
            <Route path='/perfil' element={<PrivateRoute><Perfil /></PrivateRoute>}/>
            <Route path='/configuracoes' element={<PrivateRoute><Configuracoes /></PrivateRoute>}/>
        </Routes>

    )

}


 //               
   //             
     //           
