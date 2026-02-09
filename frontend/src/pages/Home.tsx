import { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '../components/card'
import { Button } from '../components/button'
import { useNavigate } from 'react-router-dom'
import { Heart, AlertTriangle, Stethoscope, ShoppingBag, Plus, ArrowRight, UserCircle, Bell, Users, Syringe, CalendarPlus } from 'lucide-react'
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
}

interface Atividades {
    tipo: 'vacina' | 'consulta' | 'exame' | 'produto';
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
}

const primeiraLetraMaiuscula = (str: string): string => {
    if (!str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
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
                    const nextWeek = new Date();
                    nextWeek.setDate(today.getDate() + 7);

                    let vacinasVencendo = 0;
                    let consultasAgendadas = 0;
                    let produtosAcabando = 0;
                    const atividades: Atividades[] = [];
                    const petsProcessados: DetalhesPets[] = [];

                    await Promise.all(
                        tutorData.pets.map(async (pet: Pet) => {
                            const [vacinasRes, consultasRes, produtosRes, compromissosRes] = await Promise.all([
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/consultas`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/produtos`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/compromissos`).catch(() => ({ data: [] })),
                            ])

                            const vacinas: Vacina[] = vacinasRes.data;
                            const consultas: Consulta[] = consultasRes.data;
                            const produtos: Produto[] = produtosRes.data;
                            const compromissos: Compromisso[] = compromissosRes.data;


                            vacinas.forEach((vacina) => {
                                const proximaDose = new Date(vacina.proxima_dose);
                                proximaDose.setHours(0,0,0,0);
                                if (proximaDose < today) {
                                    vacinasVencendo++;
                                } else if (proximaDose >= today && proximaDose <= nextWeek) {
                                    vacinasVencendo++;
                                }
                            });

                            compromissos.forEach((compromisso) => {
                                const dataCompromisso = new Date(`${compromisso.data_compromisso}T${compromisso.hora}:00`);

                                if (dataCompromisso >= today) {
                                    consultasAgendadas++;
                                }
                            });

                            produtos.forEach((produto) => {
                                if (produto.quantidade > 0 && produto.quantidade <= 5) {
                                    produtosAcabando++;
                                }  
                            });

                            atividades.push(

                                ...vacinas.map((vacina) => ({
                                    tipo: 'vacina' as const,
                                    titulo: `Vacina: ${vacina.nome_vacina} - ${pet.nome_pet}`,
                                    descricao: `Próxima dose em ${new Date(vacina.proxima_dose).toLocaleDateString()}`,
                                    data: new Date(vacina.proxima_dose.split('T')[0] + 'T00:00:00Z'),
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
                                ...consultas.map(consulta => ({ date: new Date(consulta.data_consulta), nome: consulta.motivo })),
                            ];

                            const proximosEventos = todosEventos.filter(evento => evento.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());
                            const eventosPassados = todosEventos.filter(evento => evento.date < today).sort((a, b) => b.date.getTime() - a.date.getTime());

                            const vacinasOrdenadas = vacinas.sort((a, b) => new Date(a.proxima_dose).getTime() - new Date(b.proxima_dose).getTime());
                            const consultasOrdenadas = consultas.sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime());

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
                                if (proximaDoseDate <= nextWeek) {
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
                            vacinas: vacinasVencendo,
                            consultas: consultasAgendadas,
                            produtos: produtosAcabando,
                        });

                        const atividadesFuturas = atividades.filter(atividade => atividade.data >= today);
                        atividadesFuturas.sort((a, b) => a.data.getTime() - b.data.getTime());
                        setAtividadesRecentes(atividadesFuturas.slice(0, 4));
                        setPetsComDetalhes(petsProcessados);
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
                            <AlertTriangle />
                            Vacinas Vencendo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='info'>
                            <p>{counts.vacinas}</p>
                            <p>proximos 7 dias</p>
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
        

    </div>
  );

}