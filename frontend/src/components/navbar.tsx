import { Bell, Calendar, CheckCircle, Edit, LogOut, Settings, ShieldAlert, ShoppingBag, Trash2, User, UserCircle, X } from "lucide-react";
//import Bell from "lucide-react/dist/esm/icons/bell";
//import UserCircle from "lucide-react/dist/esm/icons/user-circle";
import { useLocation, useNavigate } from "react-router-dom";
import '../styles/NavBar.css';
import { useContext } from "react";
import StoreContext, { type Notificacao } from "./store/Context";

const NotificationPanelItem: React.FC<any> = ({ notification }) => {
    let IconComponent;
    let iconClass;

    switch (notification.tipo) {
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
        case 'alerta':
            IconComponent = ShieldAlert;
            iconClass = 'alert';
            break;
        default:
            IconComponent = CheckCircle;
            iconClass = 'default';
    }

    return (
        <div className={`notification-item notification-item-${notification.tipo}`}>
            <div className={`notification-icon notification-icon-${iconClass}`}>
                <IconComponent size={20}/>
            </div>
            <div className="notification-details">
                <p className="notification-title">{notification.titulo}</p>
                <small className="notification-subtitle">{notification.mensagem}</small>
                <span className="notification-data">{new Date(notification.data).toLocaleDateString()}</span>
            </div>
        </div>
    );
};

const ProfileSidebar: React.FC<{ store: any, navigate: any }> = ({ store, navigate }) => {

    const fotoPerfilTutor = store.fotoPerfilTutor;
    const profileImageUrl = fotoPerfilTutor ? `http://localhost:5000/api/uploads/${fotoPerfilTutor}` : null;

    const handleLogout = () => {
        if (window.confirm("Tem certeza que deseja sair?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('tutor');
            sessionStorage.removeItem('tutor');
            store.setToken(null);
            store.setTutor(null);   
            navigate('/login');
            window.location.reload();
            
        }
    };

    const handleNavigation = (path: string) => {
        store.setIsProfileOpen(false);
        navigate(path);
    }

    return (
        <>

        <div 
                className={`notifications-overlay ${store.isProfileOpen ? 'open' : ''}`} 
                onClick={() => store.setIsProfileOpen(false)}
                style={{ zIndex: 998 }} // Garante que fique abaixo do menu
        ></div>

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
    </>
    )

}

export function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const store = useContext(StoreContext);

    if (!store) return <header className="navbar">Erro ao carregar store.</header>;

    const { notificacoes, isNotificationsOpen, setIsNotificationsOpen, isProfileOpen, setIsProfileOpen, fotoPerfilTutor, limparNotificacoes } = store;

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
                    <button onClick={() => navigate("/")} className={getButtonClass("/")}>Página Inicial</button>
                    <button onClick={() => navigate("/pets")} className={getButtonClass("/pets")}>Meus Pets</button>
                    <button onClick={() => navigate("/vacinas")} className={getButtonClass("/vacinas")}>Cartão de Vacina</button>
                    <button onClick={() => navigate("/consultas-exames")} className={getButtonClass("/consultas-exames")}>Consultas/Exames</button>
                    <button onClick={() => navigate("/produtos")} className={getButtonClass("/produtos")}>Produtos</button>
                </nav>
            </div>
            <div className="navbar-right">
                <div 
                    className={`notification-bell ${isNotificationsOpen ? 'active' : ''}`} 
                    onClick={() => {
                        setIsProfileOpen(false); 
                        setIsNotificationsOpen(!isNotificationsOpen)
                    }}
                >
                    <Bell size={24} />
                    {notificacoes && notificacoes.length > 0 && (
                        <span className="notification-badge">{notificacoes.length}</span>
                    )}
                </div>

                <div 
                    className={`user-avatar ${isProfileOpen ? 'active-profile' : ''}`} 
                    onClick={() => {
                        setIsNotificationsOpen(false); 
                        setIsProfileOpen(!isProfileOpen)
                    }}
                >
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
                    {(!notificacoes || notificacoes.length === 0) ? (
                        <p className="no-notifications">Nenhuma notificação por enquanto.</p>
                    ) : (
                        notificacoes.map((notification, index) => (
                            <NotificationPanelItem key={index} notification={notification} />
                        ))
                    )}
                </div>

                 {notificacoes && notificacoes.length > 0 && (
                    <div className="sidebar-footer">
                        <button className="clear-all-btn" onClick={limparNotificacoes}>
                            <Trash2 size={16}/> Limpar tudo
                        </button>
                    </div>
                )}
        </div>   

        <div
                className={`notifications-overlay ${isNotificationsOpen ? 'open' : ''}`}
                onClick={() => setIsNotificationsOpen(false)}>
        </div>

        <ProfileSidebar store={store} navigate={navigate} />

        </>
    )
}