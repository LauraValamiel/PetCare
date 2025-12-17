import React, { useContext, useState, useEffect } from 'react';
import { Navbar } from '../components/navbar';
import { Card } from '../components/card';
import { XCircle, Lock, Mail, User, LogOut, Bell, ShieldAlert, Settings } from 'lucide-react';
import { Button } from '../components/button';
import StoreContext from '../components/store/Context';
import { useNavigate } from 'react-router-dom';
import '../styles/Perfil.css';


export default function Configuracoes() {
    const store = useContext(StoreContext);
    const navigate = useNavigate();

    const [configuracoes, setConfiguracoes] = useState(() => {
        const salvo = localStorage.getItem('user_prefS_config');
        if (salvo) {
            return JSON.parse(salvo);
        }
        return {
            notificacoesEmail: true,
            alertasVacinas: true,
            lembreteConsultas: true,
            alertasProdutos: true
        };
    });

    useEffect(() => {
        localStorage.setItem('user_prefs_config', JSON.stringify(configuracoes));
    }, [configuracoes]);

    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setConfiguracoes(prev => ({
            ...prev,
            [name]: checked
        }))
    }

    const handleLogout = () => {
        if (window.confirm("Tem certeza que deseja sair?")) {
            localStorage.removeItem('tutor');
            sessionStorage.removeItem('tutor');
            store?.setToken('');
            navigate('/login');
            window.location.reload();
        }
    };

    return (
        <div className='perfil-page'>
            <Navbar />
            <main className='perfil-container'>
                <div className='perfil-header'>
                    <div>
                        <h1>Configurações</h1>
                        <p>Personalize sua experiência e gerencie sua segurança</p>
                    </div>
                </div>

                <section id='configuracoes-secao' className='config-section'>
                    <Card className='config-card'>
                        <div className='card-header-icon'>
                            <Bell size={20}/>
                            <div>
                                <h4>Notificações</h4>
                                <small>Configure como desejar receber alertas</small>
                            </div>
                        </div>

                        <div className='config-group'>
                            <div className='config-item'>
                                <div className='config-item-details'>
                                    <label>Notificações por email</label>
                                    <small>Receba atualizações importantes por email</small>
                                </div>
                                <label className="switch"><input type="checkbox" name="notificacoesEmail" checked={configuracoes.notificacoesEmail} onChange={handleToggle} /><span className='slider round'></span></label>
                            </div>

                            <div className='config-item'>
                                <div className='config-item-details'>
                                    <label>Alertas de vacinas</label>
                                    <small>Notificações sobre vacinas vencendo</small>
                                </div>
                                <label className="switch"><input type="checkbox" name='alertasVacinas' checked={configuracoes.alertasVacinas} onChange={handleToggle} /><span className='slider round'></span></label>                       
                            </div>

                            <div className='config-item'>
                                <div className='config-item-details'>
                                    <label>Lembrete de Consultas</label>
                                    <small>Lembretes de consultas agendadas</small>
                                </div>
                                <label className="switch"><input type="checkbox" name='lembreteConsultas' checked={configuracoes.lembreteConsultas} onChange={handleToggle} /><span className='slider round'></span></label>
                            </div>
                            <div className='config-item'>
                                <div className='config-item-details'>
                                    <label>Alertas de produtos</label>
                                    <small>Notificações sobre produtos acabando</small>
                                </div>
                                    <label className="switch"><input type="checkbox" name='alertasProdutos' checked={configuracoes.alertasProdutos} onChange={handleToggle} /><span className='slider round'></span></label>
                            </div>
                        </div>
                    </Card>

                    <Card className='config-card'>
                        <div className='card-header-icon'>
                            <ShieldAlert size={20}/>
                            <div>
                                <h4>Privacidade e Segurança</h4>
                                <small>Gerencie suas informações e segurança</small>
                            </div>
                        </div>
                        <div className='security-options'>
                            <Button className='security-btn'><Lock size={18}/>Alterar Senha</Button>
                            <Button className='security-btn'><Mail size={18}/>Alterar Email</Button>
                            <Button className='security-btn'><User size={18}/>Dados Pessoais</Button>
                        </div>

                    </Card>

                    <Card className='config-card danger-zone'>
                        <div className='card-header-icon'>
                            <LogOut size={20}/>
                            <div>
                                <h4>Zona de Perigo</h4>
                                <small>Ações irreversíveis da conta</small>
                            </div>
                            </div>
                        <Button className='delete-account-btn' onClick={handleLogout}><XCircle size={20}/>Excluir Conta</Button>
                        <p className='danger-message'>Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente excluídos.</p>
                    </Card>

                </section>

            </main>

        </div>
    )

}