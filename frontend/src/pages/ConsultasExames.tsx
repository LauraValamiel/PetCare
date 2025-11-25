import React, { use, useEffect, useState } from 'react';
import axios, { all } from 'axios';
import { useNavigate } from 'react-router-dom';
import { Syringe, Stethoscope, FileText, CalendarPlus, Search, Phone, MapPin, Activity, Plus, Edit, Trash2 } from 'lucide-react';
import '../styles/ConsultasExames.css';
import { Navbar } from '../components/navbar';
import { type Pet, type Tutor, formatDate } from './MeusPets';
import { type VacinaDetalhada } from './CartaoVacina';
import { HistoricoCompletoModal } from '../components/HistoricoCompletoModal';
import { EditarVacina } from '../components/EditarVacina';
import { AgendarCompromissoModal } from '../components/AgendarCompromissoModal';
import { AdicionarClinicaModal } from '../components/AdicionarClinicaModal';
import { EditarClinicaModal } from '../components/EditarClinicaModal';
import { Button } from '../components/button';

interface Compromisso {
    id_compromisso: number;
    titulo: string;
    descricao: string;
    data_compromisso: string;
    hora: string;
    localizacao: string;
    pet_nome?: string;
}

interface Consulta {
    id_consulta: number;
    motivo: string;
    data_consulta: string;
    nome_clinica: string;
    pet_nome?: string;
}

interface Clinica {
    id_clinica: number;
    nome_clinica: string;
    endereco: string;
    telefone: string;
    email: string;
}

type HistoricoItemSumario = {
    tipo: 'vacina' | 'consulta' | 'exame' | 'compromisso';
    data: Date;
    titulo: string;
    petNome: string;
};

export function ConsultasExames() {
    const navigate = useNavigate();
    const [tutor, setTutor] = useState<Tutor | null>(() => {
        const savedTutorLocal = localStorage.getItem('tutor');
        if (savedTutorLocal) {
            return JSON.parse(savedTutorLocal);
        }
        const savedTutorSession = sessionStorage.getItem('tutor');
        return savedTutorSession ? JSON.parse(savedTutorSession) : null;
    });
    const [loading, setLoading] = useState(false);
    const [pets, setPets] = useState<Pet[]>([]);

    const [proximasConsultas, setProximasConsultas] = useState<Compromisso | null>(null);
    const [historicoItemMaisRecente, setHistoricoItemMaisRecente] = useState<HistoricoItemSumario | null>(null);
    const [proximosExames, setProximosExames] = useState<Compromisso | null>(null);

    const [clinicas, setClinicas] = useState<Clinica[]>([]);

    const [allCompromissos, setAllCompromissos] = useState<Compromisso[]>([]);
    const [allConsultas, setAllConsultas] = useState<Consulta[]>([]);
    const [allVacinas, setAllVacinas] = useState<VacinaDetalhada[]>([]);
    const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
    const [vacinaEdit, setVacinaEdit] = useState<VacinaDetalhada | null>(null);
    const [refreshData, setRefreshData] = useState(0);

    const [isAgendarConsultaModalOpen, setIsAgendarConsultaModalOpen] = useState(false);
    const [isAgendarExameModalOpen, setIsAgendarExameModalOpen] = useState(false);
    const [isAdicionarClinicaModalOpen, setIsAdicionarClinicaModalOpen] = useState(false);

    const [clinicaEdit, setClinicaEdit] = useState<Clinica | null>(null);
    const [isEditarClinicaModalOpen, setIsEditarClinicaModalOpen] = useState(false);

    const tutorId = tutor?.id_tutor;

    useEffect(() => {
        if (!tutorId) {
            setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);

            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const clinicasResponse = await axios.get(`http://localhost:5000/api/clinicas`);
                setClinicas(clinicasResponse.data || []);

                const petsResponse = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);
                const fetchedPets: Pet[] = petsResponse.data.pets || [];
                setPets(fetchedPets);

                if (fetchedPets.length === 0) {
                    setLoading(false);
                    return;
                }

                const compromissosTotais: Compromisso[] = [];
                const consultasTotais: Consulta[] = [];
                const vacinasTotais: VacinaDetalhada[] = [];

                await Promise.all(fetchedPets.map(async (pet) => {
                    const compromissosResponse = await axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/compromissos`).catch(() => ({ data: []}));
                    if (Array.isArray(compromissosResponse.data)) {
                        compromissosResponse.data.forEach((compromisso: Compromisso) => {
                            compromissosTotais.push({ ...compromisso, pet_nome: pet.nome_pet });
                        });
                    }

                    const consultasResponse = await axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/consultas`).catch(() => ({ data: []}));
                    if (Array.isArray(consultasResponse.data)) {
                        consultasResponse.data.forEach((consulta: Consulta) => {
                            consultasTotais.push({ ...consulta, pet_nome: pet.nome_pet });
                        });
                    }

                    const vacinasResponse = await axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`).catch(() => ({ data: []}));
                    if (Array.isArray(vacinasResponse.data)) {
                        vacinasResponse.data.forEach((vacina: VacinaDetalhada) => {
                            vacinasTotais.push({ ...vacina, id_pet: pet.id_pet, nome_pet: pet.nome_pet });
                        });
                    }

                }));

                setAllCompromissos(compromissosTotais);
                setAllConsultas(consultasTotais);
                setAllVacinas(vacinasTotais);

                const compromissosFuturos = compromissosTotais
                    .filter(c => new Date(c.data_compromisso) >= today)
                    .sort((a, b) => new Date(a.data_compromisso).getTime() - new Date(b.data_compromisso).getTime());

                const consultasNormaisFuturas = compromissosFuturos
                    .filter(c => !c.titulo.toLowerCase().includes('exame'))
                    .sort((a, b) => new Date(a.data_compromisso).getTime() - new Date(b.data_compromisso).getTime());

                setProximasConsultas(consultasNormaisFuturas.length > 0 ? consultasNormaisFuturas[0] : (compromissosFuturos.length > 0 ? compromissosFuturos[0] : null));

                const consultasPassadas = consultasTotais
                    .filter(c => new Date(c.data_consulta) < today && !c.motivo.toLowerCase().includes('exame'))
                    .sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime());

                setHistoricoItemMaisRecente(consultasPassadas.length > 0 ? {
                    tipo: 'consulta',
                    data: new Date(consultasPassadas[0].data_consulta),
                    titulo: consultasPassadas[0].motivo,
                    petNome: consultasPassadas[0].pet_nome || 'Pet'
                } : null);

                const examesFuturos = compromissosFuturos
                    .filter(c => c.titulo.toLowerCase().includes('exame'))
                    .sort((a, b) => new Date(a.data_compromisso).getTime() - new Date(b.data_compromisso).getTime());
                
                setProximosExames(examesFuturos.length > 0 ? examesFuturos[0] : null);

                const historicoUnificado: HistoricoItemSumario[] = [];

                vacinasTotais.forEach(vacina => {
                    if (vacina.data_vacinacao && new Date(vacina.data_vacinacao) < today) {
                        historicoUnificado.push({
                            tipo: 'vacina',
                            data: new Date(vacina.data_vacinacao),
                            titulo: vacina.nome_vacina,
                            petNome: vacina.nome_pet || 'Pet',
                        });
                    }
                });

                consultasTotais.forEach(consulta => {
                    if (new Date(consulta.data_consulta) < today) {
                        historicoUnificado.push({
                            tipo: consulta.motivo.toLowerCase().includes('exame') ? 'exame' : 'consulta',
                            data: new Date(consulta.data_consulta),
                            titulo: consulta.motivo,
                            petNome: consulta.pet_nome|| 'Pet',
                        });
                    }
                });

                compromissosTotais.forEach(compromisso => {
                    if (new Date(compromisso.data_compromisso) < today) {
                        historicoUnificado.push({
                            tipo: compromisso.titulo.toLowerCase().includes('exame') ? 'exame' : 'consulta',
                            data: new Date(compromisso.data_compromisso),
                            titulo: compromisso.titulo,
                            petNome: compromisso.pet_nome|| 'Pet',
                        });
                    }
                });

                historicoUnificado.sort((a, b) => b.data.getTime() - a.data.getTime());
                setHistoricoItemMaisRecente(historicoUnificado.length > 0 ? historicoUnificado[0] : null);


        } catch (error) {
            console.error("Erro ao buscar dados de consultas e exames: ", error);
        } finally {
            setLoading(false);
        }
    }

    fetchData();

    }, [tutorId, refreshData]);

    const handleDataChanged = () => {
        setRefreshData(prev => prev + 1);
    }

    const handleAgendarConsulta = () => {
        setIsAgendarConsultaModalOpen(true);
    }

    const handleAdicionarClinica = () => {
        setIsAdicionarClinicaModalOpen(true);
    }

    const handleVerHistorico = () => {
        setIsHistoricoModalOpen(true);
    }

    const handleAgendarExame = () => {
        setIsAgendarExameModalOpen(true);
    }

    const handleExcluirClinica = async (clinica: Clinica) => {
        if (window.confirm(`Tem certeza que deseja excluir a clínica "${clinica.nome_clinica}"? Esta ação não pode ser desfeita.`)) {
            try {
                const response = await axios.delete(`http://localhost:500/api/clinica/${clinica.id_clinica}`);

                if (response.status === 200) {
                    alert('Clínica excluída com sucesso.');
                    handleDataChanged();
                }
            } catch (erro: any) {
                console.error("Erro ao excluir clínica:", erro);
                alert(erro.response?.data?.error || 'Erro ao excluir clínica.')
            }
        }
    }

    return (
        <div className='consultas-exames-container'>
            <Navbar/>
            <main className='consultas-exames-main'>
                <div className='consultas-exames-header'>
                    <h1>Consultas & Exames</h1>
                    <p>Histórico médico e agendamentos</p>
                </div>

                {loading ? (
                    <p>Carregando dados...</p>
                ) : (
                    <>
                        <section className='summary-cards'>
                        <div className='card summary-card proximas-consultas-card'>
                            <div className='card-header-flex'>
                                <div className='card-icon'>
                                    <Stethoscope size={24} />
                                </div>
                                <h3>Próximas Consultas</h3>
                            </div>
                            {proximasConsultas ? (
                                <div className='item-info'>
                                    <h4>{proximasConsultas.pet_nome} - {proximasConsultas.titulo}</h4>
                                    <div className='item-info-detalhes'>
                                        <p className='detalhes-consulta'>{proximasConsultas.localizacao}</p>
                                        <span className='item-info-data'>{formatDate(proximasConsultas.data_compromisso)} - {proximasConsultas.hora}</span>
                                    </div>     
                                </div>
                            ) : (
                                <div className='item-info-placeholder'>
                                    <p>Nenhuma consulta futura agendada.</p>
                                </div>
                            )}
                            <button className='action-button primary-button' onClick={handleAgendarConsulta}>
                                <CalendarPlus size={16} /> Agendar Consulta
                            </button>
                        </div>

                        <div className='card summary-card historico-medico-card'>
                            <div className='card-header-flex'>
                                <div className='card-icon'><FileText size={24}/></div>
                                <h3>Histórico Médico</h3>
                            </div>
                            {historicoItemMaisRecente ? (
                                <div className='item-info'>
                                <h4>{historicoItemMaisRecente.petNome} - {historicoItemMaisRecente.titulo}</h4>
                                <div className='item-info-detalhes'>
                                    <span>{formatDate(historicoItemMaisRecente.data.toISOString())}</span>
                                </div>
                                
                            </div>
                            ) : (
                                <div className='item-info-placeholder'>
                                    <p>Nenhum histórico encontrado.</p>
                                </div>
                            )}
                            <button className='action-button secondary-button' onClick={handleVerHistorico}>
                                <Search size={16} /> Ver Histórico Completo
                            </button>
                        </div>

                        <div className='card summary-card exames-recentes-card'>
                            <div className='card-header-flex'>
                                <div className='card-icon'><Syringe size={24}/></div>
                                <h3>Próximos Exames</h3>
                            </div>
                            {proximosExames ? (
                                <div className='item-info'>
                                <h4>{proximosExames.pet_nome} - {proximosExames.titulo}</h4>
                                <div className='item-info-detalhes'>
                                    <p className='detalhes-consulta'>{proximosExames.localizacao}</p>
                                    <span className='item-info-data'>{formatDate(proximosExames.data_compromisso)} - {proximosExames.hora}</span>                                </div>
                            </div>
                            ) : (
                                <div className='item-info-placeholder'>
                                    <p>Nenhum exame marcado para os próximos dias.</p>
                                </div>
                            )}
                            <button className='action-button primary-button' onClick={handleAgendarExame}>
                                <Syringe size={16}/> Agendar novo exame
                            </button>
                        </div>
                    </section>

                    <section className='vet-clinicas-section'>
                        <h2>Clínicas Veterinárias Cadastradas</h2>
                        {clinicas.length > 0 ? (
                            <div className='clinicas-grid'>
                            {clinicas.map((clinica) => (
                                <div key={clinica.id_clinica} className='card clinica-card'>
                                    <div className='clinica-card-header-actions'>
                                        <h3>{clinica.nome_clinica}</h3>
                                        <div className='clinica-actions'>
                                            <Button
                                                variant='link'
                                                className="action-btn edit-btn"
                                                onClick={() => {
                                                    setClinicaEdit(clinica);
                                                    setIsEditarClinicaModalOpen(true);
                                                }}>
                                                    <Edit size={18}/>
                                            </Button>
                                            <Button
                                                variant='link'
                                                className='action-btn danger delete-btn'
                                                onClick={() => handleExcluirClinica(clinica)}>
                                                    <Trash2 size={18}/>
                                            </Button>
                                        </div>
                                    </div>
                                    <p>{clinica.email}</p>
                                    <div className='contato-clinica'>
                                        <p><MapPin size={16}/>{clinica.endereco}</p>
                                        <p><Phone size={16}/>{clinica.telefone}</p>
                                    </div>
                                    
                                    
                                </div>
                            ))}

                        </div>
                        ) : (
                            <p>Nenhuma clínica cadastrada no momento.</p>
                        )}

                        <div style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className='action-button primary-button' onClick={handleAdicionarClinica} style={{ width: 'auto' }}>
                                <Plus size={16}/>Adicionar Clínica
                            </button>
                        </div>
                    </section>

                    </>
                )}

                
            </main>

            <HistoricoCompletoModal
                isOpen={isHistoricoModalOpen}
                onClose={() => setIsHistoricoModalOpen(false)}
                consultas={allConsultas}
                compromissos={allCompromissos}
                vacinas={allVacinas}
                setVacinaEdit={setVacinaEdit}
            />

            {vacinaEdit && (
                <EditarVacina
                    isOpen={!!vacinaEdit}
                    onClose={() => setVacinaEdit(null)}
                    onVacinaAtualizada={() => {
                        setVacinaEdit(null);
                        handleDataChanged();
                    }}
                    pets={pets}
                    vacina={vacinaEdit}
                />
            )}

            {tutorId && (
                <AgendarCompromissoModal
                    isOpen={isAgendarConsultaModalOpen}
                    onClose={() => setIsAgendarConsultaModalOpen(false)}
                    onCompromissoAdded={handleDataChanged}
                    pets={pets}
                    tutorId={tutorId}
                    tipo='consulta'
                />
            )}

            {tutorId && (
                <AgendarCompromissoModal
                isOpen={isAgendarExameModalOpen}
                onClose={() => setIsAgendarExameModalOpen(false)}
                onCompromissoAdded={handleDataChanged}
                pets={pets}
                tutorId={tutorId}
                tipo='exame'
                />
            )}

            <AdicionarClinicaModal
                isOpen={isAdicionarClinicaModalOpen}
                onClose={() => setIsAdicionarClinicaModalOpen(false)}
                onClinicaAdded={handleDataChanged}
            />

            {clinicaEdit && (
                <EditarClinicaModal
                    isOpen={isEditarClinicaModalOpen}
                    onClose={() => {
                        setIsEditarClinicaModalOpen(false);
                        setClinicaEdit(null);
                    }}
                    onClinicaUpdated={handleDataChanged}
                    clinica={clinicaEdit}
                />
            )}

        </div>

    )

}