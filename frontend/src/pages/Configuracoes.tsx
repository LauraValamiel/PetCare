import React, { useContext, useState, useEffect } from 'react';
import { Navbar } from '../components/navbar';
import { Card } from '../components/card';
import { XCircle, Lock, Mail, User, LogOut, Bell, ShieldAlert } from 'lucide-react';
import { Button } from '../components/button';
import StoreContext from '../components/store/Context';
import { useNavigate } from 'react-router-dom';
import '../styles/Perfil.css';
import { AlterarSenhaModal } from '../components/AlterarSenhaModal';
import { AlterarEmailModal } from '../components/AlterarEmailModal';
import axios from 'axios';

interface Preferencias {
    notif_geral: boolean;
    notif_vacinas: boolean;
    notif_consultas: boolean;
    notif_produtos: boolean;
}

export default function Configuracoes() {
    const store = useContext(StoreContext);
    const navigate = useNavigate();
    const tutorId = store?.tutor?.id_tutor;
    const emailAtual = store?.tutor?.email;

    const [preferencias, setPreferencias] = useState<Preferencias>({
        notif_geral: true,
        notif_vacinas: true,
        notif_consultas: true,
        notif_produtos: true
    });    
    const [loading, setLoading] = useState(true);

    const [isSenhaModalOpen, setIsSenhaModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    useEffect(() => {
        const carregarPreferencia = async () => {
            if (!tutorId) return;
            try {
                const response = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);
                const dados = response.data;
                
                setPreferencias({
                    notif_geral: (dados.notif_geral === false) ? false : true,
                    notif_vacinas: (dados.notif_vacinas === false) ? false : true,
                    notif_consultas: (dados.notif_consultas === false) ? false : true,
                    notif_produtos: (dados.notif_produtos === false) ? false : true,
                });

            } catch (error) {
                console.error("Erro ao carregar preferências:", error);
            } finally {
                setLoading(false);
            }
        };
        carregarPreferencia();
    }, [tutorId]);

    const handleToggleNotificacoes = async (campo: keyof Preferencias, valor: boolean) => {
        if (!tutorId) return;

        // Atualização Otimista: Atualiza a tela instantaneamente
        const estadoAnterior = { ...preferencias };
        const novasPreferencias = { ...preferencias, [campo]: valor };
        setPreferencias(novasPreferencias);

        try {
            await axios.put(`http://localhost:5000/api/tutores/${tutorId}/notificacoes`, {
                [campo]: valor
            });

            if (store?.setTutor && store.tutor) {
                const tutorAtualizado = { ...store.tutor, ...novasPreferencias };
                store.setTutor(tutorAtualizado);
                localStorage.setItem('tutor', JSON.stringify(tutorAtualizado));
            }

        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            setPreferencias(estadoAnterior);
            alert("Erro ao salvar. Verifique sua conexão.");
        }
    };

    const handleExcluirConta = async () => {
        if (!tutorId) {
            alert("Erro: ID do tutor não encontrado.");
            return;
        }

        const confirmacao = window.confirm(
            "ATENÇÃO: Esta ação é irreversível! Todos os seus dados e de seus pets serão apagados. Deseja realmente excluir sua conta?"
        );

        if (confirmacao) {
            try {
                const response = await fetch(`http://localhost:5000/api/tutores/${tutorId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    alert("Sua conta foi excluída com sucesso.");
                    localStorage.removeItem('tutor');
                    sessionStorage.removeItem('tutor');
                    store?.setToken('');
                    navigate('/login');
                } else {
                    const errorData = await response.json();
                    alert(`Erro ao excluir conta: ${errorData.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error("Erro na requisição:", error);
                alert("Não foi possível conectar ao servidor para excluir a conta.");
            }
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
                                    <label>Notificações Gerais por email</label>
                                    <small>Receba lembretes automáticos do sistema</small>
                                </div>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={preferencias.notif_geral} 
                                        onChange={(e) => handleToggleNotificacoes('notif_geral', e.target.checked)} 
                                    />
                                    <span className='slider round'></span>
                                </label>
                            </div>

                            <div className='config-item'>
                                <div className='config-item-details'>
                                    <label>Alertas de vacinas</label>
                                    <small>Notificações sobre vacinas vencendo</small>
                                </div>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={preferencias.notif_vacinas} 
                                        onChange={(e) => handleToggleNotificacoes('notif_vacinas', e.target.checked)} 
                                    />
                                    <span className='slider round'></span>
                                </label>
                            </div>

                            <div className='config-item'>
                                <div className='config-item-details'>
                                    <label>Lembrete de Consultas</label>
                                    <small>Lembretes de consultas agendadas</small>
                                </div>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={preferencias.notif_consultas} 
                                        onChange={(e) => handleToggleNotificacoes('notif_consultas', e.target.checked)} 
                                    />
                                    <span className='slider round'></span>
                                </label>
                            </div>

                            <div className='config-item'>
                                <div className='config-item-details'>
                                    <label>Alertas de produtos</label>
                                    <small>Notificações sobre produtos acabando</small>
                                </div>
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={preferencias.notif_produtos} 
                                        onChange={(e) => handleToggleNotificacoes('notif_produtos', e.target.checked)} 
                                    />
                                    <span className='slider round'></span>
                                </label>
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
                            <Button className='security-btn' onClick={() => setIsSenhaModalOpen(true)}><Lock size={18}/>Alterar Senha</Button>
                            <Button className='security-btn' onClick={() => setIsEmailModalOpen(true)}><Mail size={18}/>Alterar Email</Button>
                            <Button className='security-btn' onClick={() => navigate('/perfil')}><User size={18}/>Dados Pessoais</Button>
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
                        <Button className='delete-account-btn' onClick={handleExcluirConta}><XCircle size={20}/>Excluir Conta</Button>
                        <p className='danger-message'>Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente excluídos.</p>
                    </Card>

                </section>

            </main>

            <AlterarSenhaModal 
                isOpen={isSenhaModalOpen} 
                onClose={() => setIsSenhaModalOpen(false)} 
                tutorId={tutorId} 
            />
            <AlterarEmailModal 
                isOpen={isEmailModalOpen} 
                onClose={() => setIsEmailModalOpen(false)} 
                tutorId={tutorId}
                emailAtual={emailAtual || undefined} 
            />

        </div>
    );

}