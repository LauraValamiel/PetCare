import React, { useEffect,useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardTitle } from '../components/card';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
import { useNavigate } from 'react-router-dom';
import { Plus, ShieldCheck, AlertTriangle, XCircle, Shield, Edit, Trash2, ShieldAlert } from 'lucide-react';
import { Navbar } from '../components/navbar';
import { type Pet,  type Tutor,  type Vacina, primeiraLetraMaiuscula, formatDate } from './MeusPets';
import '../styles/CartaoVacina.css';
import { AdicionarVacina } from '../components/AdicionarVacina';
import { EditarVacina } from '../components/EditarVacina';

export interface VacinaDetalhada extends Vacina {
    id_vacina: number;
    id_pet: number;
    nome_pet?: string;
    nome_vacina: string;
    local_aplicacao?: string;
    observacoes?: string;
    lote?: string;
    nome_veterinario?: string;
    data_vacinacao: string;
    proxima_dose: string;
    preco_vacina?: number;
}

interface CountsResumo {
    em_dia: number;
    vencendo: number;
    atrasadas: number;
    total: number;
}

type VacinaStatus = {
    variant: 'success' | 'warning' | 'danger';
    text: 'Em dia' | 'Vencendo' | 'Atrasada';
};

export default function CartaoVacina() {
    const [tutor, setTutor] = useState<Tutor | null>(() => {
        const savedTutorLocal = localStorage.getItem('tutor');
        if (savedTutorLocal) {
            return JSON.parse(savedTutorLocal);
        }
        const savedTutorSession = sessionStorage.getItem('tutor');
        return savedTutorSession ? JSON.parse(savedTutorSession) : null;
    });
    const [pets, setPets] = useState<Pet[]>([]);
    const [todasVacinas, setTodasVacinas] = useState<VacinaDetalhada[]>([]);
    const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
    const [countsResumo, setCountsResumo] = useState<CountsResumo>({em_dia: 0, vencendo: 0, atrasadas: 0, total: 0});
    const [vacinasAtrasadasComPet, setVacinasAtrasadasComPet] = useState<VacinaDetalhada[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [isAdicionarModalOpen, setIsAdicionarModalOpen] = useState(false);
    const [vacinaEdit, setVacinaEdit] = useState<VacinaDetalhada | null>(null);
    const [refreshData, setRefreshData] =useState(0);

    const handleVacinaDataChanged = () => {
        setRefreshData(prev => prev + 1);
    }

    const tutorId = tutor?.id_tutor;

    useEffect(() =>{
        const currentTutorId: number | null = tutor?.id_tutor || null;

        if (!currentTutorId) {
            setLoading(false);
            setPets([]);
            setTodasVacinas([]);
            setCountsResumo({em_dia: 0, vencendo: 0, atrasadas: 0, total: 0});
            setVacinasAtrasadasComPet([]);
            setSelectedPetId(null);
            return;
        }

        async function fetchData(tutorId: number) {
            setLoading(true);
            
            try {
                const petsResponse = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);

                const tutorData: Tutor = petsResponse.data;
                const fetchedPets = Array.isArray((tutorData as any).pets) ? (tutorData as any).pets : [];
                setPets(fetchedPets);

                if (fetchedPets.length > 0) {
                    const vacinasPromises = fetchedPets.map((pet: Pet) =>
                        axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`)
                        .then(response => {
                             const vacinasData = Array.isArray(response.data) ? response.data : [];
                             return vacinasData.map((v: Vacina): VacinaDetalhada => ({...v, id_pet: pet.id_pet, nome_pet: pet.nome_pet}));
                        })
                        .catch(err => {
                             console.warn(`[cv] Falha ao buscar vacinas para pet ${pet.id_pet}:`, err);
                             return [];
                        })
                    );

                    const vacinasPorPet = await Promise.all(vacinasPromises);
                    const allVacinas: VacinaDetalhada[] = vacinasPorPet.flat();
                    setTodasVacinas(allVacinas);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const nextWeek = new Date();
                    nextWeek.setDate(today.getDate() + 7);
                    let emDiaCount = 0;
                    let vencendoCount = 0;
                    let atrasadasCount = 0;
                    const atrasadasComPet: VacinaDetalhada[] = [];

                    allVacinas.forEach(v => {
                        try {
                            if (v.proxima_dose && typeof v.proxima_dose === 'string') {
                                const proximaDose = new Date(v.proxima_dose);
                                if (!isNaN(proximaDose.getTime())){
                                    proximaDose.setHours(0,0,0,0);
                                    if (proximaDose < today) {
                                        atrasadasCount++;
                                        atrasadasComPet.push(v);
                                    } else if (proximaDose <= nextWeek) {
                                        vencendoCount++
                                    } else {
                                        emDiaCount++;
                                    }
                                } else {
                                    console.warn("Data 'proxima_dose' inválida:" , v.proxima_dose, "para vacina:", v );
                                    emDiaCount++;
                                }
                            } else {
                                emDiaCount++;
                            }
                        } catch (erro) {
                            console.warn("Data inválida para vacina: ", v);
                        }
                    });

                    setCountsResumo({
                        em_dia: emDiaCount,
                        vencendo: vencendoCount,
                        atrasadas: atrasadasCount,
                        total: allVacinas.length
                    });

                    setVacinasAtrasadasComPet(atrasadasComPet);

                } else {
                    setTodasVacinas([]);
                    setCountsResumo({em_dia: 0, vencendo: 0, atrasadas: 0, total: 0});
                    setVacinasAtrasadasComPet([]);
                    setSelectedPetId(null);
                }

            } catch (erro) {
                setPets([]);
                setTodasVacinas([]);
                setCountsResumo({em_dia: 0, vencendo: 0, atrasadas: 0, total: 0});
                setVacinasAtrasadasComPet([]);
                setSelectedPetId(null);
            } finally {
                setLoading(false);
            }
        }

        fetchData(currentTutorId);

    }, [tutor, refreshData]);
    

    useEffect(() => {
        if (!loading) {
            if (pets.length > 0 && selectedPetId === null) {
                setSelectedPetId(pets[0].id_pet);
            }
        }
    }, [pets, loading, selectedPetId]);

    const vacinasDoPetSelecionado = todasVacinas.filter(v => v.id_pet === selectedPetId)
                                                .sort((a, b) => {
                                                    const dateA = a.data_vacinacao ? new Date(a.data_vacinacao).getTime() : 0;
                                                    const dateB = b.data_vacinacao ? new Date(b.data_vacinacao).getTime() : 0;
                                                    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
                                                });


    const selectedPetInfo = pets.find(p => p.id_pet === selectedPetId);

    const getWarningMessage = () => {
        if (countsResumo.atrasadas === 0){
            return null;
        }
        const petNomes = [...new Set(vacinasAtrasadasComPet.map(v => v.nome_pet))].join(', ');
        const vacinaNomes = [...new Set(vacinasAtrasadasComPet.map(v => v.nome_vacina))].join(', ');
        return `${countsResumo.atrasadas} vacina(s) atrasada(s): ${petNomes} - ${vacinaNomes}`;
    };

    const warningMessage = getWarningMessage();

    const getVacinaStatus = (proximaDoseStr: string | null): VacinaStatus => {
        if (!proximaDoseStr) {
            return { variant: 'success', text: 'Em dia' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        try {
            const proximaDose = new Date(proximaDoseStr);
            if (isNaN(proximaDose.getTime())) {
                return { variant: 'success', text: 'Em dia' };
            }
            proximaDose.setHours(0, 0, 0, 0);

            if (proximaDose < today) {
                return { variant: 'danger', text: 'Atrasada' };
            } else if (proximaDose <= nextWeek) {
                return { variant: 'warning', text: 'Vencendo' };
            } else {
                return { variant: 'success', text: 'Em dia'};
            }
        } catch (erro) {
            return {variant: 'success', text: 'Em dia' };
        }

    };

    const handleExcluirVacina = async (vacina: VacinaDetalhada) => {
        if (window.confirm(`Tem certeza que deseja excluir a vacina "${vacina.nome_vacina}" do pet "${vacina.nome_pet}"`)) {
            try {
                const response = await axios.delete(`http://localhost:5000/api/pets/${vacina.id_pet}/deletar-vacina/${vacina.id_vacina}`);

                if (response.status === 200) {
                    alert('Vacina excluída com sucesso.');
                    handleVacinaDataChanged();
                }
            } catch (erro: any) {
                console.error("Erro ao excluir vacina:", erro);
                alert(erro.response?.data?.error || 'Erro ao excluir vacina.')
            }
        }
            
    };

    return (
        <div className='cartao-vacina-page'>
            <Navbar/>
            <main className='cartao-vacina-container'>
                <div className='cartao-vacina-header'>
                    <div>
                        <h2>Cartão de Vacinas</h2>
                        <p>Acompanhe o calendário vacinal dos seus pets.</p>
                    </div>
                    <Button variant='primary' onClick={() => setIsAdicionarModalOpen(true)}> <Plus size={16}/>Adicionar Vacina</Button>
                </div>

                {warningMessage && (
                    <div className='warning-banner'>
                        <AlertTriangle size={18} /> {warningMessage}
                    </div>
                )}

                <div className='resumo-vacinas-card'>
                    <Card className='card-em-dia'>
                            <CardTitle><ShieldCheck size={16}/>Em Dia</CardTitle>
                            <CardContent>
                                {countsResumo.em_dia}
                            </CardContent>
                    </Card>
                    <Card className='card-vencendo'>
                            <CardTitle><AlertTriangle size={16}/>Vencendo</CardTitle>
                            <CardContent>{countsResumo.vencendo}</CardContent>
                    </Card>
                    <Card className='card-atrasadas'>
                            <CardTitle><XCircle size={16}/>Atrasadas</CardTitle>
                            <CardContent>{countsResumo.atrasadas}</CardContent>
                    </Card>
                    <Card className='card-total'>
                            <CardTitle><Shield size={16}/>Total</CardTitle>
                            <CardContent>{countsResumo.total}</CardContent>
                    </Card>
                </div>

                <div className='vacina-pet-area'>
                    <div className='pet-selection-header'>
                        <h4>Cartões de Vacina por Pet</h4>
                    </div>
                    <div className='pet-tabs-container'>
                        {pets.map(pet =>(
                            <button
                                key={pet.id_pet}
                                className={`pet-tab ${pet.id_pet === selectedPetId ? 'active' : ''}`}
                                onClick={() => setSelectedPetId(pet.id_pet)}> 
                                    {primeiraLetraMaiuscula(pet.nome_pet)}
                                </button>
                        ))}
                    </div>

                    <div className='vacina-list-section'>
                        {loading && <p>Carregando vacinas...</p>}
                        {!loading && selectedPetInfo && (
                            <>
                                <div className='vacina-list-header'>
                                    <h3>{primeiraLetraMaiuscula(selectedPetInfo.nome_pet)} - {primeiraLetraMaiuscula(selectedPetInfo.especie)}</h3>
                                    <span>{vacinasDoPetSelecionado.length} vacinas resgistradas</span>
                                </div>

                                {vacinasDoPetSelecionado.length === 0 ? (
                                    <p>Nenhuma vacina registrada para este pet.</p>
                                ) : (
                                    <div className='vacina-cards-grid'>
                                        {vacinasDoPetSelecionado.map(vacina => {
                                            const status = getVacinaStatus(vacina.proxima_dose);

                                            return (
                                                <div key={vacina.id_vacina} className='vacina-card'>
                                                <div className='vacina-card-header'>
                                                    <div className='vacina-header-left'>
                                                        <h4>{vacina.nome_vacina}</h4>
                                                        <Badge variant={status.variant}>
                                                            {status.variant === 'success' && <ShieldCheck size={12}/>}
                                                            {status.variant === 'warning' && <ShieldAlert size={12}/>}
                                                            {status.variant === 'danger' && <XCircle size={12}/>}
                                                            {status.text}
                                                        </Badge>
                                                    </div>

                                                    <div className='vacina-header-actions'>
                                                        <Button variant="link" className="action-btn" onClick={() => setVacinaEdit(vacina)}><Edit size={18}/></Button>
                                                        <Button variant="link" className="action-btn danger" onClick={() => handleExcluirVacina(vacina)}><Trash2 size={18}/></Button>
                                                    </div>
                                                </div>
                                                <div className='vacina-card-body'>
                                                    <div className='vacina-detail-item'>
                                                        <span className='label'> Data Aplicação </span>
                                                        <span className='value'>{formatDate(vacina.data_vacinacao)}</span>
                                                    </div>
                                                    <div className='vacina-detail-item'>
                                                        <span className='label'>Próxima Dose </span>
                                                        <span className='value'>{formatDate(vacina.proxima_dose)}</span>
                                                    </div>
                                                    <div className='vacina-detail-item'>
                                                        <span className='label'>Veterinário</span>
                                                        <span className='value'>{vacina.nome_veterinario || 'N/A'}</span>
                                                    </div>
                                                    <div className='vacina-detail-item'>
                                                        <span className='label'>Lote</span>
                                                        <span className='value'>{vacina.lote || 'N/A'}</span>
                                                    </div>
                                                    <div className='vacina-detail-item full-width'>
                                                        <span className='label'>Observações</span>
                                                        <span className='value obs'>{vacina.observacoes || 'Nenhuma'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )})}

                                    </div>
                                )}
                            </>
                        )}

                        {!loading && pets.length === 0 ? (
                            <p>Você ainda não cadastrou nenhum pet.</p>
                        ) : null}

                    </div>

                </div>
                

            </main>

            {tutorId && (
                <AdicionarVacina
                    isOpen={isAdicionarModalOpen}
                    onClose={() => setIsAdicionarModalOpen(false)}
                    onVacinaAdded={handleVacinaDataChanged}
                    pets={pets}
                    tutorId={tutorId}
                />
            )}

            {vacinaEdit && (
                <EditarVacina
                    isOpen={!!vacinaEdit}
                    onClose={() => setVacinaEdit(null)}
                    onVacinaAtualizada={handleVacinaDataChanged}
                    pets={pets}
                    vacina={vacinaEdit}
                />
            )}

        </div>
    )

}