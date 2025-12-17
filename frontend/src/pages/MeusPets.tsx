import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { Button } from '../components/button';
import { useNavigate } from "react-router-dom";
import { Heart, Plus, Users, Calendar, ShieldCheck, ShieldAlert, Edit } from 'lucide-react';
import { Badge } from '../components/badge';
import { Navbar } from "../components/navbar";
import { AdicionarPet } from "../components/AdicionarPet";
import { EditarPet } from "../components/EditarPet";
import { VerPet } from "../components/VerPet";
import '../styles/MeusPets.css'
import '../styles/NavBar.css'

export interface Pet {
    id_pet: number;
    nome_pet: string;
    especie: string;
    raca: string;
    genero: string;
    data_nascimento: string;
    idade: number;
    peso: number;
    castrado: boolean;
    foto_perfil: string | null;
}

export interface Vacina {
    id_vacina: number;
    nome_vacina: string;
    data_vacinacao: string;
    proxima_dose: string;
}

export interface Consulta {
    id_consulta: number;
    motivo: string;
    data_consulta: string;
}

export interface Tutor {
    id_tutor: number;
    nome_completo: string;
    pets: Pet[];
}

export interface DetalhesPets extends Pet {
    statusVacina: 'Em dia' | 'Vencendo' | 'Atrasada';
    ultimaVacina: string;
    proximaVacina: string;
    ultimaConsulta: string;
}

export const formatDate = (dateString: string | undefined | null) : string => {
    if (!dateString) return '--/--/----';
    try{
        /*const cleanDateString = dateString.split('T')[0];
        
        // 2. Cria a data forçando a leitura como UTC (T00:00:00Z)
        const dateObj = new Date(cleanDateString + 'T00:00:00Z'); 

        if (isNaN(dateObj.getTime())) {
            return '--/--/----';
        }

        // 3. Usa os métodos getUTC* para extrair o dia, mês e ano originais.
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
        const year = dateObj.getUTCFullYear();
        
        return `${day}/${month}/${year}`;*/

        let dateToProcess = dateString;

        if (!dateString.includes('T')) {
            dateToProcess = dateString;
        } else {
            dateToProcess = dateString.split('T')[0] + 'T00:00:00Z';
        }

        const dateObj = new Date(dateToProcess); 

        if (isNaN(dateObj.getTime())) {
            return '--/--/----';
        }

        // 2. Usamos os métodos getUTC* para garantir que o dia/mês/ano original seja exibido.
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const year = dateObj.getUTCFullYear();
        
        return `${day}/${month}/${year}`;

    } catch (erro) {
        return '--/--/----';
    }
}

export const primeiraLetraMaiuscula = (str: string): string => {
    if (!str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function MeusPets() {

    const [tutor, setTutor] = useState<Tutor | null>(() =>{
        const savedTutorLocal = localStorage.getItem('tutor')
        if (savedTutorLocal) {
            return JSON.parse(savedTutorLocal);
        }

        const savedTutorSession = sessionStorage.getItem('tutor');
        return savedTutorSession ? JSON.parse(savedTutorSession) : null;
    });

    const [loading, setLoading] = useState(true);
    const [detalhesPet, setDetalhesPet] = useState<DetalhesPets[]>([]);
    const [counts, setCounts] = useState({
        pets: 0,
        vacinasVencendo: 0,
        vacinasEmDia: 0,
    });

    const navigate = useNavigate();
    const tutorId = tutor ? tutor.id_tutor : null;

    const [isAdicionarModalOpen, setIsAdicionarModalOpen] = useState(false);
    const [petEdit, setPetEdit] = useState<DetalhesPets | null>(null);
    const [petView, setPetView] = useState<DetalhesPets | null>(null);
    const [refreshData, setRefreshData] = useState(0);

    useEffect(() => {
        async function fetchDetalhesPets(){
            if (!tutorId) {
                setLoading(false);
                return;
            }

            try {
                const tutorPetsResponse = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);
                const tutorData: Tutor = tutorPetsResponse.data;

                if (tutorData.pets?.length > 0) {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const nextWeek = new Date();
                    nextWeek.setDate(today.getDate() + 7);

                    let vacinasVencendoCount = 0;
                    let vacinasEmDiaCount = 0;

                    const processedDetalhesPets: DetalhesPets[] = [];

                    await Promise.all(
                        tutorData.pets.map(async (pet: Pet) => {
                            const [vacinasResponse, consultasResponse] = await Promise.all([
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`).catch(() => ({ data: [] })),
                                axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/consultas`).catch(() => ({ data: [] })),
                            ]);

                            const vacinas: Vacina[] = vacinasResponse.data;
                            const consultas: Consulta[] = consultasResponse.data;

                            const vacinasOrdenadas = vacinas.sort((a, b) => new Date(a.proxima_dose).getTime() - new Date(b.proxima_dose).getTime());
                            const consultasOrdenadas = consultas.sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime());

                            const vacinasFuturas = vacinasOrdenadas.filter(v => new Date(v.proxima_dose) >= today);
                            const vacinasPassadas = vacinasOrdenadas.filter(v => new Date(v.proxima_dose) < today);
                            const consultasPassadas = consultasOrdenadas.filter(c => new Date(c.data_consulta) <= today).sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime());
                            const vacinacoesPassadas = vacinas.filter(v => new Date(v.data_vacinacao) <= today).sort((a, b) => new Date(b.data_vacinacao).getTime() - new Date(a.data_vacinacao).getTime());

                            let statusVacina: DetalhesPets['statusVacina'] = 'Em dia';
                            let proximaVacinaData: string | null = null;

                            if (vacinasFuturas.length > 0) {
                                const proximaDose = new Date(vacinasFuturas[0].proxima_dose);
                                proximaVacinaData = vacinasFuturas[0].proxima_dose;

                                if (proximaDose <= nextWeek) {
                                    statusVacina = 'Vencendo';
                                    vacinasVencendoCount++;
                                } else {
                                    vacinasEmDiaCount++;
                                }
                            } else if (vacinasPassadas.length > 0) {
                                statusVacina = 'Atrasada';
                                proximaVacinaData = vacinasPassadas[vacinasPassadas.length - 1].proxima_dose;
                            } else {
                                vacinasEmDiaCount++;
                            }

                            const ultimaVacina = vacinacoesPassadas.length > 0 ? vacinacoesPassadas[0].data_vacinacao : null;
                            const ultimaConsulta = consultasPassadas.length > 0 ? consultasPassadas[0].data_consulta : null;

                            processedDetalhesPets.push({
                                ...pet,
                                statusVacina,
                                ultimaVacina: formatDate(ultimaVacina),
                                proximaVacina: formatDate(proximaVacinaData),
                                ultimaConsulta: formatDate(ultimaConsulta),
                            });
                        })
                    );

                    setCounts({
                        pets: tutorData.pets.length,
                        vacinasVencendo: vacinasVencendoCount,
                        vacinasEmDia: vacinasEmDiaCount,
                    });

                    processedDetalhesPets.sort((a, b) => a.nome_pet.localeCompare(b.nome_pet));
                    setDetalhesPet(processedDetalhesPets);
                }
            } catch (erro) {
                console.error("Erro ao carregar pets", erro);
            } finally {
                setLoading(false);
            }
        }

        fetchDetalhesPets();
    }, [tutorId, refreshData])


    const handlePetDataChange = () => {
        setRefreshData(prev => prev + 1);
    }


    return (
        <div className="pets-page">
            <Navbar />
                <main className="pets-container">
                    <div className="pets-header">
                        <div>
                            <h2>Meus pets 🐾</h2>
                            <p>Cuidando do seu melhor amigo</p>
                        </div>
                        <Button variant='primary' onClick={() => setIsAdicionarModalOpen(true)}><Plus size={16}/> Adicionar Pet </Button>
                    </div>

                    <div className="pets-summary-cards">
                        <Card className="card-total-pets">
                            <CardHeader>
                                <CardTitle>Total de Pets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="info">
                                    <p>{counts.pets}</p>
                                </div>
                                <div className="card-icon pets">
                                    <Users size={24}/>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-vacinas-vencendo">
                            <CardHeader>
                                <CardTitle><ShieldAlert />Vacinas Vencendo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="info">
                                    <p>{counts.vacinasVencendo}</p>
                                </div>
                                <div className="card-icon vacinas-vencendo">
                                    <Calendar size={24}/>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-vacinas-em-dias">
                            <CardHeader>
                                <CardTitle><ShieldCheck/>Vacinas em Dia</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="info">
                                    <p>{counts.vacinasEmDia}</p>
                                </div>
                                <div className="card-icon vacinas-em-dias">
                                    <Calendar size={24}/>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="pets-grid">
                        {loading && <p>Carregando pets...</p>}
                        {!loading && detalhesPet.map((pet) => (
                            <Card 
                                key={pet.id_pet} 
                                className="pet-card-detail" 
                                onClick={(e: React.MouseEvent) => {
                                    if ((e.target as HTMLElement).closest('.edit-btn')){
                                        return
                                    }
                                    setPetView(pet)
                                    }}>
                                <div className="pet-card-header">
                                    <div className="pet-card-info">
                                        <div className="heart-icon">
                                            {pet.foto_perfil ? (
                                                <img src={`http://localhost:5000/api/uploads/${pet.foto_perfil}`}  alt={pet.nome_pet} className="foto_perfil_pet"/>
                                            ) : (<Heart size={24}/>)}
                                            </div>
                                        <div className="pet-details">
                                            <p className="pet-name"><strong>{primeiraLetraMaiuscula(pet.nome_pet)}</strong></p>
                                            <small>{primeiraLetraMaiuscula(pet.especie)} • {primeiraLetraMaiuscula(pet.raca)} </small>
                                        </div>
                                    </div>
                                    <Button variant="link" className="edit-btn" onClick={() => setPetEdit(pet)}><Edit size={18}/></Button>
                                </div>

                                <div className="pet-card-status">
                                    <div className="status-item">
                                        <span className="status-label">Idade</span>
                                        <span className="status-value">{pet.idade} anos</span>
                                    </div>
                                    <div className="status-item">
                                        <span className="status-label">Peso</span>
                                        <span className="status-value">{pet.peso} kg</span>
                                    </div>
                                    <div className="status-item">
                                        <span className="status-label">Status Vacina</span>
                                        <Badge variant={
                                            pet.statusVacina === 'Atrasada' ? 'danger' :
                                            pet.statusVacina === 'Vencendo' ? 'warning' : 'success'
                                        }>{pet.statusVacina}</Badge>
                                    </div>
                                </div>

                                <ul className="pet-card-details-list">
                                    <li>
                                        <span>Última vacina:</span>
                                        <span>{pet.ultimaVacina}</span>
                                    </li>
                                    <li>
                                        <span>Próxima vacina:</span>
                                        <span>{pet.proximaVacina}</span>
                                    </li>
                                    <li>
                                        <span>Última consulta:</span>
                                        <span>{pet.ultimaConsulta}</span>
                                    </li>

                                </ul>

                            </Card>
                        ))}
                    </div>

                </main>

                {tutorId && (
                    <AdicionarPet
                        isOpen={isAdicionarModalOpen}
                        onClose={() => setIsAdicionarModalOpen(false)}
                        onPetAdded={handlePetDataChange}
                        tutorId={tutorId}
                    />
                )}

                {petEdit && tutorId && (
                    <EditarPet
                        isOpen={!!petEdit}
                        onClose={() => setPetEdit(null)}
                        onPetAtualizado={handlePetDataChange}
                        pet={petEdit}
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

        </div>
    )



}
