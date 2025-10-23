import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '../components/card'
import { Button } from '../components/button'
import { useNavigate } from 'react-router-dom'
import { Heart, Shield, AlertTriangle, Calendar, Stethoscope, ShoppingBag, Plus, ArrowRight, UserCircle, Bell, Users, Syringe, CalendarPlus } from 'lucide-react'
import { Badge } from '../components/badge'
import { Navbar } from '../components/navbar'
import { AdicionarPet } from '../components/AdicionarPet'
import '../styles/Home.css'

interface Pet {
    id_pet: number;
    nome_pet: string;
    especie: string;
    raca: string;
    idade: number;
    foto_perfil: string |null;
}

interface Tutor {
    id_tutor: number;
    nome_completo: string;
    pets: Pet[];
}

interface Vacina {
    id_vacina: number;
    nome_vacina: string;
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
    tipo: 'vacina' | 'consulta' | 'produto';
    titulo: string;
    descricao: string;
    data: Date;
}

interface PetComStatus extends Pet {
    status: 'Em dia' | 'Vencido' | 'Atrasado';
    next_event: string;
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
    const [petsComStatus, setPetsComStatus] = useState<PetComStatus[]>([]);
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshData, setRefreshData] = useState(0);

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
                //Buscar dados do tutor e listar os pets
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
                    const petsStatus: PetComStatus[] = [];

                    // Buscando dados de cada pet
                    await Promise.all(
                        tutorData.pets.map(async (pet: Pet) => {
                            const [vacinasRes, consultasRes, produtosRes] = await Promise.all([
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/consultas`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/produtos`).catch(() => ({ data: [] })),
                            ])

                            const vacinas: Vacina[] = vacinasRes.data;
                            const consultas: Consulta[] = consultasRes.data;
                            const produtos: Produto[] = produtosRes.data;

                            // Dados para os cards de resumo

                            vacinas.forEach((vacina) => {
                                const proximaDose = new Date(vacina.proxima_dose);
                                if (proximaDose >= today && proximaDose <= nextWeek) {
                                    vacinasVencendo++;
                                }
                            });

                            consultas.forEach((consulta) => {
                                const dataConsulta = new Date(consulta.data_consulta);
                                if (dataConsulta >= today && dataConsulta <= nextWeek) {
                                    consultasAgendadas++;
                                }
                            });

                            produtos.forEach((produto) => {
                                if (produto.quantidade > 0 && produto.quantidade <= 5) {
                                    produtosAcabando++;
                                }  
                            });

                            // Dados para atividades recentes
                            atividades.push(

                                ...vacinas.map((vacina) => ({
                                    tipo: 'vacina' as const,
                                    titulo: `Vacina: ${vacina.nome_vacina} - ${pet.nome_pet}`,
                                    descricao: `Próxima dose em ${new Date(vacina.proxima_dose).toLocaleDateString()}`,
                                    data: new Date(vacina.proxima_dose),
                                })),

                                ...consultas.map((consulta) => ({
                                    tipo: 'consulta' as const,
                                    titulo: `Consulta: ${consulta.motivo} - ${pet.nome_pet}`,
                                    descricao: `Data: ${new Date(consulta.data_consulta).toLocaleDateString()}`,
                                    data: new Date(consulta.data_consulta),
                                }))
                            );

                            // Status dos pets

                            const todosEventos = [
                                ...vacinas.map(vacina => ({ date: new Date(vacina.proxima_dose), nome: vacina.nome_vacina })),
                                ...consultas.map(consulta => ({ date: new Date(consulta.data_consulta), nome: consulta.motivo })),
                            ];

                            const proximosEventos = todosEventos.filter(evento => evento.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());
                            const eventosPassados = todosEventos.filter(evento => evento.date < today).sort((a, b) => b.date.getTime() - a.date.getTime());

                            let petStatus: PetComStatus['status'] = 'Em dia';
                            let nextEvent = 'Nenhum evento futuro';

                            if (eventosPassados.length > 0) {
                                petStatus = 'Atrasado';
                                nextEvent = `Próximo: ${eventosPassados[0].nome} em ${eventosPassados[0].date.toLocaleDateString()}`;
                            } else if (proximosEventos.length > 0) {
                                petStatus = 'Em dia';
                                nextEvent = `Próximo: ${proximosEventos[0].nome} em ${proximosEventos[0].date.toLocaleDateString()}`;
                            }

                            petsStatus.push({...pet, status: petStatus, next_event: nextEvent});
                        })
                        );

                        // Atualiza estados
                        setCounts({
                            pets: tutorData.pets.length,
                            vacinas: vacinasVencendo,
                            consultas: consultasAgendadas,
                            produtos: produtosAcabando,
                        });

                        // Ordena atividades por data e pega as 5 mais recentes
                        const atividadesFuturas = atividades.filter(atividade => atividade.data >= today);
                        atividadesFuturas.sort((a, b) => a.data.getTime() - b.data.getTime());
                        setAtividadesRecentes(atividadesFuturas.slice(0, 5));

                        setPetsComStatus(petsStatus);
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
 

    return (
    <div className='home-page'>
        <Navbar />
        <main className='dashboard'>
            <div className='dashboard-header'>
                <div>
                    <h2>Dashboard</h2>
                    <p>Olá, {tutor?.nome_completo}! 🐾 </p>
                    <p>Aqui está um resumo dos seus pets!</p>
                </div>
                <Button variant='primary' onClick={() => setIsModalOpen(true)}> <Plus size={16} /> Adicionar Pet </Button>
            </div>

            {/* Resumo */}
            <div className='summary-cards'>
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

            {/* Atividades recentes */}
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
                        <Button variant='link' onClick={() => navigate("/atividades")}> Ver todas as atividades<ArrowRight size={16}/></Button>
                    </div>
            </ section>

            {/* Meus Pets */}
            <section className='meus-pets'>
                <div className='section-header'>
                    <h3><Heart size={20}/>Meus Pets 🐾</h3>
                    <Button variant='outline' onClick={() => navigate("/pets")}> Ver todos</Button>  
                </div>
                    <ul className='pets-list'>
                        {petsComStatus.map((pet) => (
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
                                    <Badge variant={pet.status === 'Atrasado' ? 'danger' : 'success'}>
                                        {pet.status}
                                    </Badge>
                                    <p><small>{pet.next_event}</small></p>
                                    <Button
                                        variant="outline"
                                        className="mt-3"
                                        onClick={() => navigate(`/pets/${pet.id_pet}`)}
                                    >
                                    Ver Detalhes
                                    </Button>
                                </div>  
                            </li>
                        ))}
                    </ul>
            </section>
            </div>
            
            {/* Ações rápidas */}
            <section className='acoes-section'>
                <h2> Ações rápidas </h2>
                <div className='acoes-buttons'>
                    <Button className='acoes-buttons-card' onClick={() => setIsModalOpen}><Plus size={24}/><span>Adicionar Pet</span></Button>
                    <Button className='acoes-buttons-card' onClick={() => navigate("/vacinas")}><Syringe size={24}/><span>Registrar Vacina</span></Button>
                    <Button className='acoes-buttons-card' onClick={() => navigate("/consultas")}><CalendarPlus size={24}/><span>Agendar Consulta</span></Button>
                    <Button className='acoes-buttons-card' onClick={() => navigate("/produtos")}><ShoppingBag size={24}/><span>Adicionar Produto</span></Button>
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
    </div>
  );

}