import { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '../components/card'
import { Button } from '../components/button'
import { useNavigate } from 'react-router-dom'
import { Heart, AlertTriangle, Stethoscope, ShoppingBag, Plus, ArrowRight, UserCircle, Bell, Users, Syringe, CalendarPlus, Calendar, ChevronLeft, ChevronRight, Scissors } from 'lucide-react'
import { Badge } from '../components/badge'
import { Navbar } from '../components/navbar'
import { VerPet } from '../components/VerPet'
import { AdicionarPet } from '../components/AdicionarPet'
import '../styles/Home.css'
import { formatDate, type DetalhesPets } from './MeusPets'
import { AdicionarVacina } from '../components/AdicionarVacina'
import { AgendarCompromissoModal } from '../components/AgendarCompromissoModal'
import StoreContext, { type Notificacao } from '../components/store/Context'
import React from 'react'
import { AdicionarProdutoModal } from '../components/AdicionarProdutoModal'

interface Pet {
    peso: number
    id_pet: number;
    nome_pet: string;
    especie: string;
    raca: string;
    idade: number;
    foto_perfil: string |null;
    genero: string;
    data_nascimento: string;
    castrado: boolean;
}

interface Tutor {
    id_tutor: number;
    nome_completo: string;
    pets: Pet[];
}

interface Vacina {
    id_vacina: number;
    nome_vacina: string;
    data_vacinacao: string;
    proxima_dose: string;
}

interface Consulta {
    id_consulta: number;
    motivo: string;
    data_consulta: string; 
}

interface Produto {
    id_compra: number;
    nome_produto: string;
    quantidade: number;
    consumo_medio: number;
    consumo_periodo: 'dia' | 'semana' | 'mes';
    data_validade?: string;
}

interface Atividades {
    tipo: 'vacina' | 'consulta' | 'exame' | 'produto' | 'outro';
    titulo: string;
    descricao: string;
    data: Date;
}

interface Compromisso {
    id_compromisso: number;
    titulo: string;
    descricao: string;
    data_compromisso: string;
    hora: string;
    localizacao: string;
    pet_nome?: string;
    pet_foto?: string | null;
}

const primeiraLetraMaiuscula = (str: string): string => {
    if (!str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const toDateStringLocal = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Home() {

    const [tutor, setTutor] = useState<Tutor | null>(() => {
        const savedTutorLocal = localStorage.getItem('tutor');
        if (savedTutorLocal){
          return JSON.parse(savedTutorLocal);  
        }
        const savedTutorSession = sessionStorage.getItem('tutor');
        return savedTutorSession ? JSON.parse(savedTutorSession) : null;
        
    });
    
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({
        pets: 0,
        vacinas: 0,
        consultas:0,
        produtos: 0,
    });

    const [atividadesRecentes, setAtividadesRecentes] = useState<any[]>([])
    const navigate = useNavigate();
    const [petsComDetalhes, setPetsComDetalhes] = useState<DetalhesPets[]>([]);

    const [datasMarcadas, setDatasMarcadas] = useState<Set<string>>(new Set());
    const [eventosCalendario, setEventosCalendario] = useState<Record<string, string[]>>({});
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    const [outrosCompromissos, setOutrosCompromissos] = useState<Compromisso[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAdicionarOutroModalOpen, setIsAdicionarOutroModalOpen] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshData, setRefreshData] = useState(0);
    const [petView, setPetView] = useState<DetalhesPets | null>(null);
    const [isAdicionarVacinaModalOpen, setIsAdicionarVacinaModalOpen] = useState(false);
    const [isAgendarConsultaModalOpen, setIsAgendarConsultaModalOpen] = useState(false);
    const [isAdicionarProdutoModalOpen, setIsAdicionarProdutoModalOpen] = useState(false);

    const store =  useContext(StoreContext);
    const carregarNotificacoesGlobais = store?.carregarNotificacoes;

    const getFirstName = (fullName: string | undefined) => {
        if (!fullName) {
            return '';
        }
        return fullName.split(' ')[0];
    }

    const tutorId = tutor ? tutor.id_tutor : null;
    

    useEffect(() => {
        async function fetchDashboard(){
            if (!tutorId) {
                setLoading(false);
                return;
            }
            try {
                const tutorPets = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);
                const tutorData = tutorPets.data;
                setTutor(tutorData);

                if (tutorData.pets?.length > 0) {
                    const today = new Date();
                    today.setHours(0,0,0,0);

                    const endOfWeek = new Date(today);
                    endOfWeek.setDate(today.getDate() + 7);

                    let vacinasAtrasadas= 0;
                    let consultasAgendadas = 0;
                    let produtosAcabando = 0;
                    const atividades: Atividades[] = [];
                    const petsProcessados: DetalhesPets[] = [];

                    const todosOutrosCompromissos: Compromisso[] = [];

                    await Promise.all(
                        tutorData.pets.map(async (pet: Pet) => {
                            const [vacinasRes, consultasRes, produtosRes, compromissosRes] = await Promise.all([
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/consultas/semana`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/produtos`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/compromissos`).catch(() => ({ data: [] })),
                            ])

                            const vacinas: Vacina[] = vacinasRes.data;
                            const consultasSemana: Consulta[] = consultasRes.data;
                            const produtos: Produto[] = produtosRes.data;
                            const compromissos: Compromisso[] = compromissosRes.data;

                            console.log(`\n--- [FRONTEND] Pet: ${pet.nome_pet} (ID: ${pet.id_pet}) ---`);
                            console.log(`[DEBUG] Consultas Recebidas (${consultasSemana.length}):`, consultasSemana);

                            consultasAgendadas += consultasSemana.length;

                            const vacinasAtrasadasPet = vacinas.filter((v: any) => new Date(v.proxima_dose) < today);
                            vacinasAtrasadas += vacinasAtrasadasPet.length;

                            const listaAcabando = produtos.filter((p: any) => {
                                const qtd = Number(p.quantidade);
                                let consumoDiario = Number(p.consumo_medio);
                                
                                if (p.consumo_periodo === 'semana') consumoDiario /= 7;
                                if (p.consumo_periodo === 'mes') consumoDiario /= 30;
                                if (p.consumo_periodo === 'ano' || !p.consumo_periodo) {
                                     if (p.consumo_periodo === 'ano') consumoDiario /= 365;
                                }

                                const diasRestantes = (consumoDiario && consumoDiario > 0) ? (qtd / consumoDiario) : 999;
                                
                                const estaAcabando = qtd <= 0 || diasRestantes <= 7;
                                
                                if (estaAcabando) {
                                    console.log(`[DEBUG] ACABANDO: ${p.nome_produto} (${pet.nome_pet}) - Qtd: ${qtd} - Dias Restantes: ${diasRestantes.toFixed(1)}`);
                                }
                                return estaAcabando;
                            });

                            produtosAcabando += listaAcabando.length;

                            const compromissosFiltrados = compromissos.filter(c => !c.titulo.toLowerCase().includes('exame') && new Date(`${c.data_compromisso}T00:00:00`) >= today);
                            compromissosFiltrados.forEach(c => todosOutrosCompromissos.push({
                                ...c, 
                                pet_nome: pet.nome_pet,
                                pet_foto: pet.foto_perfil 
                            }));

                            console.log(`[DEBUG] Produtos Recebidos (${produtos.length}):`, produtos);

                            atividades.push(

                                ...vacinas.map((vacina) => ({
                                    tipo: 'vacina' as const,
                                    titulo: `Vacina: ${vacina.nome_vacina} - ${pet.nome_pet}`,
                                    descricao: `Próxima dose em ${new Date(vacina.proxima_dose).toLocaleDateString()}`,
                                    data: new Date(vacina.proxima_dose),
                                })),

                                ...compromissos.filter(c => new Date(c.data_compromisso) >= today).map((compromisso) => {
                                    const tipo = compromisso.titulo.toLowerCase().includes('exame') ? 'exame' : 'consulta';
                                    const dataHora = new Date(`${compromisso.data_compromisso}T${compromisso.hora}:00Z`);

                                    return {
                                        tipo: tipo as Atividades['tipo'],
                                        titulo: `${primeiraLetraMaiuscula(compromisso.titulo)} - ${pet.nome_pet}`,
                                        descricao: `Em ${formatDate(compromisso.data_compromisso)} às ${compromisso.hora || 'N/A'}`,
                                        data: dataHora,
                                    };

                                }),
                            );

                            const todosEventos = [
                                ...vacinas.map(vacina => ({ date: new Date(vacina.proxima_dose), nome: vacina.nome_vacina })),
                                ...consultasSemana.map(consulta => ({ date: new Date(consulta.data_consulta), nome: consulta.motivo })),
                            ];

                            const proximosEventos = todosEventos.filter(evento => evento.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());
                            const eventosPassados = todosEventos.filter(evento => evento.date < today).sort((a, b) => b.date.getTime() - a.date.getTime());

                            const vacinasOrdenadas = vacinas.sort((a, b) => new Date(a.proxima_dose).getTime() - new Date(b.proxima_dose).getTime());
                            const consultasOrdenadas = consultasSemana.sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime());

                            const vacinasFuturas = vacinasOrdenadas.filter(v => new Date(v.proxima_dose) >= today);
                            const vacinasPassadas = vacinasOrdenadas.filter(v => new Date(v.proxima_dose) < today);
                            const consultasPassadas = consultasOrdenadas.filter(c => new Date(c.data_consulta) <= today).sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime());
                            const vacinacoesPassadas = vacinas.filter(v => new Date(v.data_vacinacao) <= today).sort((a, b) => new Date(b.data_vacinacao).getTime() - new Date(a.data_vacinacao).getTime());

                            let statusVacina: DetalhesPets['statusVacina'] = 'Em dia';
                            let proximaVacinaData: string | null = null;

                            if (vacinasPassadas.length > 0) {
                                statusVacina = 'Atrasada';
                                proximaVacinaData = vacinasPassadas[vacinasPassadas.length -1].proxima_dose;
                            } else if (vacinasFuturas.length > 0) {
                                const proximaDoseDate = new Date(vacinasFuturas[0].proxima_dose);
                                proximaVacinaData = vacinasFuturas[0].proxima_dose
                                if (proximaDoseDate <= endOfWeek) {
                                    statusVacina = 'Vencendo';
                                } else {
                                    statusVacina = 'Em dia';
                                }
                            } else {
                                statusVacina = 'Em dia';
                                proximaVacinaData = null;
                            }


                            const ultimaVacina = vacinacoesPassadas.length > 0 ? vacinacoesPassadas[0].data_vacinacao : null;
                            const ultimaConsulta = consultasPassadas.length > 0 ? consultasPassadas[0].data_consulta : null;
                            
                            petsProcessados.push({
                                ...pet,
                                statusVacina,
                                ultimaVacina: formatDate(ultimaVacina),
                                proximaVacina: formatDate(proximaVacinaData),
                                ultimaConsulta: formatDate(ultimaConsulta),
                                peso: pet.peso
                            });

                        })
                        );

                        setCounts({
                            pets: tutorData.pets.length,
                            vacinas: vacinasAtrasadas,
                            consultas: consultasAgendadas,
                            produtos: produtosAcabando,
                        });

                        const atividadesFuturas = atividades.filter(atividade => atividade.data >= today);
                        atividadesFuturas.sort((a, b) => a.data.getTime() - b.data.getTime());
                        setAtividadesRecentes(atividadesFuturas.slice(0, 4));
                        setPetsComDetalhes(petsProcessados);
                        todosOutrosCompromissos.sort((a,b) => new Date(`${a.data_compromisso}T${a.hora || '00:00'}`).getTime() - new Date(`${b.data_compromisso}T${b.hora || '00:00'}`).getTime());
                        setOutrosCompromissos(todosOutrosCompromissos.slice(0, 5)); // Mostra os próximos 5

                        const marcadas = new Set(atividades.map(act => toDateStringLocal(act.data)));
                        setDatasMarcadas(marcadas);

                        const mapaEventos: Record<string, string[]> = {};
                        atividades.forEach(act => {
                            const dataStr = toDateStringLocal(act.data);
                            if (!mapaEventos[dataStr]) {
                                mapaEventos[dataStr] = [];
                            }
                            mapaEventos[dataStr].push(act.titulo);
                        });
                        setEventosCalendario(mapaEventos);
                    }

            } catch (err) {
                console.error("Erro ao carregar dashboard", err);   
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, [tutorId, refreshData]);

    const handlePetAdicionado = () => {
        setRefreshData(prev => prev + 1);
    }

    const handleVacinaAdicionada = () => {
        setRefreshData(prev => prev +1);
    }
 
    const handleDataChanged = () => {
        setRefreshData(prev => prev + 1);
    }
    
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const renderCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = toDateStringLocal(new Date());

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ padding: '10px' }}></div>);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const hasEvent = datasMarcadas.has(dateStr);

            const eventosDoDia = eventosCalendario[dateStr];
            const isHovered = hoveredDate === dateStr;

            days.push(
                <div 
                    key={i} 
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    style={{
                        padding: '8px',
                        textAlign: 'center',
                        borderRadius: '8px',
                        backgroundColor: isToday ? '#3b82f6' : 'transparent', // Dia atual fica azul
                        color: isToday ? 'white' : '#333',
                        fontWeight: isToday ? 'bold' : 'normal',
                        position: 'relative',
                        cursor: hasEvent ? 'pointer' : 'default'
                    }}
                >
                    {i}
                    {hasEvent && (
                        <div style={{
                            width: '6px', height: '6px', backgroundColor: isToday ? 'white' : '#ef4444', // Bolinha vermelha nos dias com compromisso
                            borderRadius: '50%', margin: '2px auto 0'
                        }}></div>
                    )}

                    {hasEvent && isHovered && (
                        <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: '#333',
                            color: '#fff',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            zIndex: 10,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            marginBottom: '6px',
                            pointerEvents: 'none'
                        }}>
                            {eventosDoDia.map((texto, idx) => (
                                <div key={idx} style={{marginBottom: '2px'}}>{texto}</div>
                            ))}
                            {/* Setinha do balão */}
                            <div style={{
                                position: 'absolute', top: '100%', left: '50%',
                                transform: 'translateX(-50%)',
                                borderWidth: '5px', borderStyle: 'solid',
                                borderColor: '#333 transparent transparent transparent'
                            }}></div>
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
    <div className='home-page'>
        <Navbar />
        <main className='dashboard'>
            <div className='dashboard-header'>
                <div>
                    <p>Olá, {tutor?.nome_completo}! 🐾 </p>
                    <p>Aqui está um resumo dos seus pets!</p>
                </div>
                <Button variant='primary' onClick={() => setIsModalOpen(true)}> <Plus size={16} /> Adicionar Pet </Button>
            </div>

            <div className='summary-cards-home'>
                <Card className='card-total-pets'>
                    <CardHeader>
                        <CardTitle>Total de Pets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='info'>
                            <p>{counts.pets}</p>
                            <p>pets cadastrados</p>
                        </div>
                        <div className='card-icon pets'>
                            <Users size={24}/>
                        </div>
                        
                    </CardContent>
                </Card>

                <Card className='card-vacinas'>
                    <CardHeader>
                        <CardTitle>
                            <Syringe />
                            Vacinas Atrasadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='info'>
                            <p>{counts.vacinas}</p>
                            <p>atrasadas no momento</p>
                        </div>
                        <div className='card-icon vacinas'>
                            <AlertTriangle size={24}/>
                        </div>
                    </CardContent>    
                </Card>

                <Card className='card-consultas'>
                    <CardHeader>
                        <CardTitle>
                            <Stethoscope />
                            Consultas Agendadas
                            </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='info'>
                            <p>{counts.consultas}</p>
                            <p>esta semana</p>
                        </div>
                        <div className='card-icon consultas'>
                            <Stethoscope size={24}/>
                        </div>
                    </CardContent>
                </Card>

                <Card className='card-produtos'>
                    <CardHeader>
                        <CardTitle>
                            <ShoppingBag />
                            Produtos Acabando
                            </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='info'>
                            <p>{counts.produtos}</p>
                            <p>acabando</p>
                        </div>
                        <div className='card-icon produtos'>
                            <ShoppingBag size={24}/>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <section style={{ display: 'flex', gap: '24px', margin: '24px 0', flexWrap: 'wrap' }}>
                
                {/* LADO ESQUERDO: Card do Calendário Dinâmico */}
                <Card style={{ flex: '1 1 300px', padding: '20px', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}><Calendar size={20} color='#3b82f6'/> Calendário</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={20}/></button>
                            <span style={{ fontWeight: '600', minWidth: '100px', textAlign: 'center' }}>{meses[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ChevronRight size={20}/></button>
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {renderCalendarDays()}
                    </div>
                    <div style={{ marginTop: '16px', fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%'}}></div> Dias com eventos
                    </div>
                </Card>

                {/* LADO DIREITO: Card de Outros Compromissos (Banho/Tosa) */}
                <Card style={{ flex: '1 1 350px', padding: '20px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}><Scissors size={20} color='#f59e0b'/> Banho, Tosa & Outros</h3>
                        {/* Botão que abre o modal de Agendar na versão "outro" */}
                        <Button variant='primary' onClick={() => setIsAdicionarOutroModalOpen(true)} style={{ padding: '6px 12px', fontSize: '14px' }}> <Plus size={16}/> Agendar</Button>
                    </div>
                    
                    {outrosCompromissos.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                            {outrosCompromissos.map(comp => (
                                <li key={comp.id_compromisso} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f0f0f0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                                        }}>
                                            {comp.pet_foto ? (
                                                <img src={`http://localhost:5000/api/uploads/${comp.pet_foto}`} alt={comp.pet_nome} style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                                            ) : (
                                                <Heart size={20} color="#888" />
                                            )}
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: '600', color: '#333' }}>{comp.titulo}</p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>{comp.pet_nome} • {formatDate(comp.data_compromisso)} às {comp.hora}</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '14px' }}>
                            Nenhum compromisso agendado.
                        </div>
                    )}
                </Card>
            </section>

            <div className='main-content'>
                <section className='atividades-recentes'>
                    <div className='section-header'>
                        <h3>Atividades Recentes</h3>
                    </div>

                    <ul className='lista-atividades'>
                        {atividadesRecentes.length > 0 ? atividadesRecentes.map((act, idx) => (
                            <li key={idx} className='item-atividade'>
                                <div className={`atividade-icon ${act.tipo}`}></div>
                                <div className='atividade-info'>
                                    <p>{act.titulo}</p>
                                    <small>{act.descricao}</small>
                                </div>
                            </li>

                        )) : <p>Nenhuma atividade encontrada</p>
                    }
                    </ul>
                    <div className='ver-todas-btn'>
                        <Button variant='link' onClick={() => navigate("/consultas-exames")}> Ver todas as atividades<ArrowRight size={16}/></Button>
                    </div>
            </ section>

            <section className='meus-pets'>
                <div className='section-header'>
                    <h3><Heart size={20}/>Meus Pets 🐾</h3>
                    <Button variant='outline' onClick={() => navigate("/pets")}> Ver todos</Button>  
                </div>
                    <ul className='pets-list'>
                        {petsComDetalhes.map((pet) => (
                            <li key={pet.id_pet} className='pet-card-item'>
                                <div className='pet-info'>
                                    <div className='heart-icon'>
                                        {pet.foto_perfil ? (
                                                <img src={`http://localhost:5000/api/uploads/${pet.foto_perfil}`}  alt={pet.nome_pet} className="foto_perfil_pet"/>
                                            ) : (<Heart size={24}/>)}
                                    </div>
                                    <div className='pet-details'>
                                        <p className='pet-name'><strong>{primeiraLetraMaiuscula(pet.nome_pet)}</strong></p>
                                        <small>{primeiraLetraMaiuscula(pet.especie)} • {primeiraLetraMaiuscula(pet.raca)} </small>
                                    </div>
                                </div>
                                <div className='pet-status'>
                                    <Badge variant={pet.statusVacina === 'Atrasada' ? 'danger' : pet.statusVacina === 'Vencendo' ? 'warning' : 'success'}>
                                        {pet.statusVacina}
                                    </Badge>
                                    <p><small>Próxima vacina em {pet.proximaVacina}</small></p>

                                    <Button
                                        variant="outline"
                                        className="mt-3"
                                        onClick={() => setPetView(pet)}
                                    >
                                    Ver Detalhes
                                    </Button>
                                </div>  
                            </li>
                        ))}
                    </ul>
            </section>
            </div>
            
            <section className='acoes-section'>
                <h2> Ações rápidas </h2>
                <div className='acoes-buttons'>
                    <Button className='acoes-buttons-card' onClick={() => setIsModalOpen(true)}><Plus size={24}/><span>Adicionar Pet</span></Button>
                    <Button className='acoes-buttons-card' onClick={() => setIsAdicionarVacinaModalOpen(true)}><Syringe size={24}/><span>Registrar Vacina</span></Button>
                    <Button className='acoes-buttons-card' onClick={() => setIsAgendarConsultaModalOpen(true)}><CalendarPlus size={24}/><span>Agendar Consulta</span></Button>
                    <Button className='acoes-buttons-card' onClick={() => setIsAdicionarProdutoModalOpen(true)}><ShoppingBag size={24}/><span>Adicionar Produto</span></Button>
                </div>
            </section>
        </main>
        {tutorId && (
            <AdicionarPet
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onPetAdded={handlePetAdicionado}
                tutorId={tutorId}
            />
        )}

        {petView && (
            <VerPet
                isOpen={!!petView}
                onClose={() => setPetView(null)}
                pet={petView}
            />
        )}

        {tutorId && (
            <AdicionarVacina
                isOpen={isAdicionarVacinaModalOpen}
                onClose={() => setIsAdicionarVacinaModalOpen(false)}
                onVacinaAdded={handleVacinaAdicionada}
                pets={tutor?.pets || []}
                tutorId={tutorId}
                />
            )}

        {tutorId && (
            <AgendarCompromissoModal
                isOpen={isAgendarConsultaModalOpen}
                onClose={() => setIsAgendarConsultaModalOpen(false)}
                onCompromissoAdded={handleDataChanged}
                pets={tutor?.pets || []}
                tutorId={tutorId}
                tipo='consulta'
                        />
                    )}

        {tutorId && (
                <AdicionarProdutoModal
                    isOpen={isAdicionarProdutoModalOpen}
                    onClose={() => setIsAdicionarProdutoModalOpen(false)}
                    onProdutoAdded={handleDataChanged}
                    pets={tutor?.pets || []}
                    tutorId={tutorId}
                />
            )}

        {tutorId && (
            <AgendarCompromissoModal 
                isOpen={isAdicionarOutroModalOpen} 
                onClose={() => setIsAdicionarOutroModalOpen(false)} 
                onCompromissoAdded={handleDataChanged} 
                pets={tutor?.pets || []} 
                tutorId={tutorId} 
                tipo='outro' 
            />
        )}
        

    </div>
  );

}