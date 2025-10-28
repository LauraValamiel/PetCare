import React, { useEffect,useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
import { useNavigate } from 'react-router-dom';
import { Plus, ShieldCheck, AlertTriangle, XCircle, Shield, CheckCircle } from 'lucide-react';
import { Navbar } from '../components/navbar';
import { type Pet,  type Tutor,  type Vacina, primeiraLetraMaiuscula, formatDate } from './MeusPets';
import '../styles/CartaoVacina.css';

interface VacinaDetalhada extends Vacina {
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

    useEffect(() =>{
        let currentTutorId: number | null = tutor?.id_tutor || null;

        if (!currentTutorId) {
            console.log('[cv] TutorId ausente - limpando dados e parando busca.');
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
            
            console.log('[cv] iniciando fetchdata para tutorId:', tutorId)

            try {
                const petsResponse = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);

                console.log('[cv] resposta/tutores-e-pets :', petsResponse.data)

                const tutorData: Tutor = petsResponse.data;
                const fetchedPets = Array.isArray((tutorData as any).pets) ? (tutorData as any).pets : [];
                console.log('[cv] fetchedPets antes: ', fetchedPets);
                setPets(fetchedPets);

                if (fetchedPets.length > 0) {
                    const vacinasPromises = fetchedPets.map((pet: Pet) =>
                        axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`)
                        .then(response => {
                             // Validação extra da resposta da API de vacinas
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
                    console.log('[CV] allVacinas (após flat):', allVacinas);
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
                                //nenhuma proxima dose definida
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
                    console.log('[CV] Nenhum pet encontrado no backend para este tutor.');

                    setTodasVacinas([]);
                    setCountsResumo({em_dia: 0, vencendo: 0, atrasadas: 0, total: 0});
                    setVacinasAtrasadasComPet([]);
                    setSelectedPetId(null);
                }

            } catch (erro) {
                console.error("Erro ao buscar dados das vacinas:", erro);
                setPets([]);
                setTodasVacinas([]);
                setCountsResumo({em_dia: 0, vencendo: 0, atrasadas: 0, total: 0});
                setVacinasAtrasadasComPet([]);
                setSelectedPetId(null);
            } finally {
                setLoading(false);
                console.log('[cv] fetchdata concluido')
            }
        }

        fetchData(currentTutorId);

    }, [tutor]);
    

    useEffect(() => {
        if (!loading) {
            console.log('[cv] Effect [pets] ativado. Pets.length:', pets.length, 'selectedPetId');
            if (pets.length > 0 && selectedPetId === null) {
                console.log('[cv] definindo selectedPetId inicial para:', pets[0].id_pet);
                setSelectedPetId(pets[0].id_pet);
            }
        }
    }, [pets, loading]);

    const vacinasDoPetSelecionado = todasVacinas.filter(v => v.id_pet === selectedPetId)
                                                .sort((a, b) => {
                                                    const dateA = a.data_vacinacao ? new Date(a.data_vacinacao).getTime() : 0;
                                                    const dateB = b.data_vacinacao ? new Date(b.data_vacinacao).getTime() : 0;
                                                    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
                                                });

    console.log('[CV] vacinasDoPetSelecionado count:', vacinasDoPetSelecionado.length, 'selectedPetId=', selectedPetId);


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

    return (
        <div className='cartao-vacina-page'>
            <Navbar/>
            <main className='cartao-vacina-container'>
                <div className='cartao-vacina-header'>
                    <div>
                        <h2>Cartão de Vacinas</h2>
                        <p>Acompanhe o calendário vacinal dos seus pets.</p>
                    </div>
                    <Button variant='primary' onClick={() => alert('Adicionar vacina a ser implementada')}> <Plus size={16}/>Adicionar Vacina</Button>
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
                                        {vacinasDoPetSelecionado.map(vacina => (
                                            <div key={vacina.id_vacina} className='vacina-card'>
                                                <div className='vacina-card-header'>
                                                    <h4>{vacina.nome_vacina}</h4>
                                                    <Badge variant='success'><CheckCircle size={12}/>Em dia</Badge>
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

                                                <div className='vacina-card-actions'>
                                                    <Button variant='link'>Editar</Button>
                                                    <Button variant='link' className='text-danger'>Excluir</Button>
                                                </div>

                                            </div>
                                        ))}

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

        </div>
    )

}