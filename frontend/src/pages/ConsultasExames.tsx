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
import { EditarConsultaModal } from '../components/EditarConsultaModal';
import { EditarCompromissoModal } from '../components/EditarCompromissoModal';

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

    const [proximasConsultas, setProximasConsultas] = useState<Compromisso[]>([]);
    const [historicoItemMaisRecente, setHistoricoItemMaisRecente] = useState<HistoricoItemSumario[]>([]);
    const [proximosExames, setProximosExames] = useState<Compromisso[]>([]);

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

    const [consultaEdit, setConsultaEdit] = useState<Consulta | null>(null);
    const [isEditarConsultaModalOpen, setIsEditarConsultaModalOpen] = useState(false);

    const [compromissoEdit, setCompromissoEdit] = useState<Compromisso | null>(null);
    const [isEditarCompromissoModalOpen, setIsEditarCompromissoModalOpen] = useState(false);

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
                    .filter(c => new Date(c.data_compromisso.split('T')[0] + 'T00:00:00Z') >= today)
                    .sort((a, b) => new Date(a.data_compromisso).getTime() - new Date(b.data_compromisso).getTime());

                const consultasNormaisFuturas = compromissosFuturos
                    .filter(c => !c.titulo.toLowerCase().includes('exame'))
                    .sort((a, b) => new Date(a.data_compromisso).getTime() - new Date(b.data_compromisso).getTime());

                setProximasConsultas(consultasNormaisFuturas);

                /*const consultasPassadas = consultasTotais
                    .filter(c => new Date(c.data_consulta) < today && !c.motivo.toLowerCase().includes('exame'))
                    .sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime());

                setHistoricoItemMaisRecente(consultasPassadas.length > 0 ? {
                    tipo: 'consulta',
                    data: new Date(consultasPassadas[0].data_consulta),
                    titulo: consultasPassadas[0].motivo,
                    petNome: consultasPassadas[0].pet_nome || 'Pet'
                } : null);*/

                const examesFuturos = compromissosFuturos
                    .filter(c => c.titulo.toLowerCase().includes('exame'));
                    //.sort((a, b) => new Date(a.data_compromisso).getTime() - new Date(b.data_compromisso).getTime());
                
                setProximosExames(examesFuturos);

                const historicoUnificado: HistoricoItemSumario[] = [];

                vacinasTotais.forEach(vacina => {
                    const dataVacinacao = vacina.data_vacinacao.split('T')[0];
                    if (vacina.data_vacinacao && new Date(dataVacinacao + 'T00:00:00Z') < today) {
                        historicoUnificado.push({
                            tipo: 'vacina',
                            data: new Date(dataVacinacao + 'T00:00:00Z'),
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
                setHistoricoItemMaisRecente(historicoUnificado);


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
                const response = await axios.delete(`http://localhost:5000/api/clinica/${clinica.id_clinica}`);

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

    const handleDeleteCompromisso = async (compromisso: Compromisso) => {
        if (!window.confirm(`Tem certeza que deseja excluir "${compromisso.titulo}"?`)) return;

        // Precisamos encontrar o ID do pet
        const pet = pets.find(p => p.nome_pet === compromisso.pet_nome);
        if (!pet) {
            alert('Erro: Pet não encontrado.');
            return;
        }

        try {
            await axios.delete(`http://localhost:5000/api/pets/${pet.id_pet}/compromissos/${compromisso.id_compromisso}`);
            alert('Compromisso excluído com sucesso!');
            handleDataChanged(); // Recarrega a tela
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir compromisso.');
        }
    };

    const handleDeleteConsulta = async (consulta: Consulta) => { // Usado pelo HistoricoCompletoModal
         // A lógica de exclusão do histórico será feita dentro do modal de histórico para simplificar,
         // ou passada via prop como esta função. Vamos passar via prop.
         // (Ver implementação no HistoricoCompletoModal abaixo)
    };

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
                            {proximasConsultas.length > 0 ? (
                                <div className='summary-card-list'>
                                    {proximasConsultas.map((consulta, index) => (
                                        <div className='item-info' key={index} style={{ display: 'flex', flexDirection: 'column', padding: '8px 8px', borderBottom: '1px solid #f0f0f0', width:'94%' }}>
        
                                        {/* LINHA 1: Título e Botões */}
                                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                                            <div style={{ fontSize: '1rem', color: '#2c3e50', fontWeight: '600', flex: 1, marginRight: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ color: '#4285F4' }}>{consulta.pet_nome}</span> - {consulta.titulo}
                                            </div>

                                            <div className='card-actions' style={{ display: 'flex', flexDirection: 'row', gap: '6px', flexShrink: 0  }}>
                                                <button 
                                                    className='action-btn edit-btn' 
                                                    onClick={() => {
                                                        setCompromissoEdit(consulta);
                                                        setIsEditarCompromissoModalOpen(true);
                                                    }}
                                                    title="Editar"
                                                    style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                                                >
                                                    <Edit size={14} color="#555"/>
                                                </button>
                                                <button 
                                                    className='action-btn delete-btn' 
                                                    onClick={() => handleDeleteCompromisso(consulta)}
                                                    title="Excluir"
                                                    style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: '1px solid #ffcccc', background: '#fff5f5', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={14} color="#d32f2f"/>
                                                </button>
                                            </div>
                                        </div>

                                        {/* LINHA 2: Local e Data (Lado a Lado) */}
                                        <div className='item-info-detalhes' style={{ 
                                            display: 'flex',
                                            flexDirection: 'row', 
                                            justifyContent: 'space-between', // Separa Local (Esq) e Data (Dir)
                                            alignItems: 'center',
                                            fontSize: '0.85rem', 
                                            color: '#666',
                                            width: '100%'
                                        }}>
                                            {/* Coluna 1: Local */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '65%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                <MapPin size={13} style={{ color: '#999', flexShrink: 0 }}/> 
                                                <span title={consulta.localizacao}>{consulta.localizacao}</span>
                                            </div>

                                            {/* Coluna 2: Data e Hora */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                <CalendarPlus size={13} style={{ color: '#999', flexShrink: 0 }}/> 
                                                <span className='item-info-data'>{formatDate(consulta.data_compromisso)} às {consulta.hora}</span>
                                            </div>
                                        </div>  
                                    </div>
                                ))}
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
                            {historicoItemMaisRecente.length > 0 ? (
                                <div className='summary-card-list'>
                                    {historicoItemMaisRecente.map((item, index) => (
                                        <div className='item-info' key={index}>
                                            <h4>{item.petNome} - {item.titulo}</h4>
                                            <div className='item-info-detalhes'>
                                                 <span className='item-info-data'>
                                                    {item.data && !isNaN(item.data.getTime()) ? formatDate(item.data.toISOString()) : '--/--/----'}
                                                    </span>
                                            </div>
                                        </div>
                                    ))}

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
                            {proximosExames.length > 0 ? (
                                <div className='summary-card-list'>
                                    {proximosExames.map((exame, index) => (
                                        <><div className='item-info' key={index} style={{ display: 'flex', flexDirection: 'column', padding: '8px 8px', borderBottom: '1px solid #f0f0f0', width: '94%' }}>
        
                                            {/* LINHA 1 */}
                                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                                                <div style={{ margin: 0, fontSize: '1rem', color: '#2c3e50', fontWeight: '600', flex: 1, marginRight: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <span style={{ color: '#4285F4' }}>{exame.pet_nome}</span> - {exame.titulo}
                                                </div>

                                                <div className='card-actions' style={{ display: 'flex', flexDirection: 'row', gap: '6px', flexShrink: 0 }}>
                                                    <button 
                                                        className='action-btn edit-btn' 
                                                        onClick={() => {
                                                            setCompromissoEdit(exame);
                                                            setIsEditarCompromissoModalOpen(true);
                                                        }}
                                                        title="Editar"
                                                        style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                                                    >
                                                        <Edit size={14} color="#555" />
                                                    </button>
                                                    <button 
                                                        className='action-btn delete-btn' 
                                                        onClick={() => handleDeleteCompromisso(exame)}
                                                        title="Excluir"
                                                        style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', border: '1px solid #ffcccc', background: '#fff5f5', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={14} color="#d32f2f" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* LINHA 2 */}
                                            <div className='item-info-detalhes' style={{ 
                                                display: 'flex', 
                                                flexDirection: 'row',
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                fontSize: '0.85rem', 
                                                color: '#666',
                                                width: '100%'
                                            }}>
                                                {/* Local */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '60%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                    <MapPin size={13} style={{ color: '#999', flexShrink: 0 }}/> 
                                                    <span title={exame.localizacao}>{exame.localizacao}</span>
                                                </div>

                                                {/* Data */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <CalendarPlus size={13} style={{ color: '#999', flexShrink: 0 }}/> 
                                                    <span className='item-info-data'>{formatDate(exame.data_compromisso)} às {exame.hora}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                    ))}

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
                setConsultaEdit={(consulta) => {
                    setConsultaEdit(consulta);
                    setIsEditarConsultaModalOpen(true);
                }}
                setCompromissoEdit={(compromisso) => {
                    setCompromissoEdit(compromisso);
                    setIsEditarCompromissoModalOpen(true);
                }}
                pets={pets} // Necessário para exclusão
                onDataChanged={handleDataChanged}
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

            {consultaEdit && (
                <EditarConsultaModal
                    isOpen={isEditarConsultaModalOpen}
                    onClose={() => {
                        setIsEditarConsultaModalOpen(false);
                        setConsultaEdit(null);
                    }}
                    consulta={consultaEdit}
                    idPet={pets.find(p => p.nome_pet === consultaEdit.pet_nome)?.id_pet || ''}
                    onSuccess={handleDataChanged}
                />
            )}

            {/* Edição de Compromisso (Futuro) */}
            {compromissoEdit && (
                <EditarCompromissoModal
                    isOpen={isEditarCompromissoModalOpen}
                    onClose={() => {
                        setIsEditarCompromissoModalOpen(false);
                        setCompromissoEdit(null);
                    }}
                    compromisso={compromissoEdit}
                    pets={pets}
                    onCompromissoUpdated={handleDataChanged}
                />
            )}

        </div>

    )

}