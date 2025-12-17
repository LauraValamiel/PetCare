import { Bell, Calendar, Edit, LogOut, Settings, ShieldAlert, ShoppingBag, User, UserCircle, X } from "lucide-react";
//import Bell from "lucide-react/dist/esm/icons/bell";
//import UserCircle from "lucide-react/dist/esm/icons/user-circle";
import { useLocation, useNavigate } from "react-router-dom";
import '../styles/Navbar.css';
import { useContext } from "react";
import StoreContext from "./store/Context.tsx";

const NotificationPanelItem: React.FC<any> = ({ notification }) => {
    let IconComponent;
    let iconClass;

    switch (notification.type) {
        case 'vacina':
        case 'consulta':
        case 'exame':
            IconComponent = Calendar;
            iconClass = 'calendar';
            break;
        case 'produto':
            IconComponent = ShoppingBag;
            iconClass = 'shopping-bag';
            break;
        default:
            IconComponent = ShieldAlert;
            iconClass = 'default';
    }

    return (
        <div className={`notification-item notification-item-${notification.type}`}>
            <div className={`notification-icon notification-icon-${iconClass}`}>
                <IconComponent size={20}/>
            </div>
            <div className="notification-details">
                <p className="notification-title">{notification.title}</p>
                <small className="notification-subtitle">{notification.subtitle}</small>
            </div>
        </div>
    );
};

const ProfileSidebar: React.FC<{ store: any, navigate: any }> = ({ store, navigate }) => {

    const fotoPerfilTutor = store.fotoPerfilTutor;
    const profileImageUrl = fotoPerfilTutor ? `http://localhost:5000/api/uploads/${fotoPerfilTutor}` : null;

    const handleLogout = () => {
        if (window.confirm("Tem certeza que deseja sair?")) {
            localStorage.removeItem('tutor');
            sessionStorage.removeItem('tutor');
            store.setToken(null);
            navigate('/login');
            window.location.reload();
            
        }
    };

    const handleNavigation = (path: string) => {
        store.setIsProfileOpen(false);
        navigate(path);
    }

    return (
        <div className={`profile-sidebar ${store.isProfileOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h3>Meu Perfil</h3>
                <button className="close-btn" onClick={() => store.setIsProfileOpen(false)}><X size={20}/></button>
            </div>
            <div className="profile-info">
                <div className="user-avatar profile-avatar">
                    {profileImageUrl ? (
                        <img src={profileImageUrl} alt="Foto Perfil" className="avatar-image-navbar" />
                    ) : (
                        <UserCircle size={50} />
                    )}
                </div>
                <p className="user-name">{store.nome}</p>
                <small className="user-email">{store.email}</small>
            </div>

            <div className="sidebar-content profile-content">
                <h4>Opções de Conta</h4>
                <button className="profile-option-btn" onClick={() => handleNavigation('/perfil')}><Edit size={18}/>Editar dados pessoais</button>
                <button className="profile-option-btn" onClick={() => handleNavigation('/configuracoes')}><Settings size={18}/>Configurações do App</button>
                <div className="divider"></div>
                <button className="profile-option-btn logout-btn" onClick={handleLogout}><LogOut size={18}/>LogOut</button>
            </div>

        </div>
    )

}

export function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const store = useContext(StoreContext);

    if (!store) return <header className="navbar">Erro ao carregar store.</header>;

    const { notifications, isNotificationsOpen, setIsNotificationsOpen, isProfileOpen, setIsProfileOpen, fotoPerfilTutor } = store;

    const getButtonClass = (path: string) => {
        
        if (path === "/") {
            return location.pathname === "/" || location.pathname === "/home" ? "active" : "";
        }
        return location.pathname === path ? "active" : "";

    }

    const profileImageUrl = fotoPerfilTutor ? `http://localhost:5000/api/uploads/${fotoPerfilTutor}` : null;

    return (
        <>
        <header className="navbar">
            <div className="navbar-left">
                <h1 className="navbar-logo"> 🐾 PetCare </h1>
                <nav>
                    <button onClick={() => navigate("/")} className={getButtonClass("/")}>Página inicial</button>
                    <button onClick={() => navigate("/pets")} className={getButtonClass("/pets")}>Meus Pets</button>
                    <button onClick={() => navigate("/vacinas")} className={getButtonClass("/vacinas")}>Cartão de Vacina</button>
                    <button onClick={() => navigate("/consultas-exames")} className={getButtonClass("/consultas-exames")}>Consultas/Exames</button>
                    <button onClick={() => navigate("/produtos")} className={getButtonClass("/produtos")}>Produtos</button>
                </nav>
            </div>
            <div className="navbar-right">
                <div className={`notification-bell ${isNotificationsOpen ? 'active' : ''}`} onClick={() => {setIsProfileOpen(false); setIsNotificationsOpen(!isNotificationsOpen)}}>
                    <Bell size={24} />
                    {notifications.length > 0 && (
                        <span className="notification-badge">{notifications.length}</span>)} {/* Exemplo de badge de notificação - arrumar*/}{/* Exemplo de badge de notificação - arrumar*/} {/* Exemplo de badge de notificação - arrumar*/}
                </div>
                <div className={`user-avatar ${isProfileOpen ? 'active-profile' : ''}`} onClick={() => {setIsNotificationsOpen(false); setIsProfileOpen(!isProfileOpen)}}>
                    {profileImageUrl ? (
                        <img src={profileImageUrl} alt="Foto Perfil" className="avatar-image-navbar" />
                    ) : (
                        <UserCircle size={30} />
                    )}
                </div>

            </div>
        </header>
        <div className={`notifications-sidebar ${isNotificationsOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Notificações</h3>
                    <button className="close-btn" onClick={() => setIsNotificationsOpen(false)}><X size={20} /></button>
                </div>
                <div className="sidebar-content">
                    {notifications.length === 0 ? (
                        <p className="no-notifications">Nenhuma notificação por enquanto.</p>
                    ) : (
                        notifications.map((notification, index) => (
                            <NotificationPanelItem key={index} notification={notification} />
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="sidebar-footer">
                        <button onClick={() => store.setNotifications([])} className="clear-all-btn">Limpar todas</button>
                    </div>
                )}
            </div>
            <div className={`notifications-overlay ${isNotificationsOpen ? 'open' : ''}`} 
                onClick={() => setIsNotificationsOpen(false)}>

            </div>
            
            <ProfileSidebar store={store} navigate={navigate} />

            </>
    )
}