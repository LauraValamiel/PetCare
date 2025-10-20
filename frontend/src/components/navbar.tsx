import { Bell, UserCircle } from "lucide-react";
//import Bell from "lucide-react/dist/esm/icons/bell";
//import UserCircle from "lucide-react/dist/esm/icons/user-circle";

import { useLocation, useNavigate } from "react-router-dom";
import '../styles/Navbar.css';

export function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const getButtonClass = (path: string) => {
        
        if (path === "/") {
            return location.pathname === "/" || location.pathname === "/Home" ? "active" : "";
        }
        return location.pathname === path ? "active" : "";

    }

    return (
        <header className="navbar">
            <div className="navbar-left">
                <h1 className="navbar-logo"> 🐾 PetCare </h1>
                <nav>
                    <button onClick={() => navigate("/")} className={getButtonClass("/")}>Dashboard</button>
                    <button onClick={() => navigate("/pets")} className={getButtonClass("/pets")}>Meus Pets</button>
                    <button onClick={() => navigate("/vacinas")} className={getButtonClass("/vacinas")}>Cartão de Vacina</button>
                    <button onClick={() => navigate("/consultas")} className={getButtonClass("/consultas")}>Consultas/Exames</button>
                    <button onClick={() => navigate("/produtos")} className={getButtonClass("/produtos")}>Produtos</button>
                </nav>
            </div>
            <div className="navbar-right">
                <div className="notification-bell">
                    <Bell size={24}/>
                    <span className="notification-badge">3</span> {/* Exemplo de badge de notificação - arrumar*/}
                </div>
                <div className="user-avatar">
                    <UserCircle size={24}/>
                </div>
                
            </div>
        </header>
    )
}