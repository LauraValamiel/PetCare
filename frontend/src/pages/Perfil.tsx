import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Navbar } from '../components/navbar';
import { Card } from '../components/card';
import { User, ShieldCheck, Calendar, Users, Edit, Check, X, FileText, ShoppingBag, UserCircle, Camera, UserPlus} from 'lucide-react';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
import StoreContext from '../components/store/Context';
import { formatDate } from './MeusPets';
import '../styles/Perfil.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { ConvidarTutorModal } from '../components/ConvidarTutorModal'; 

interface TutorData {
    id_tutor: number;
    nome_completo: string;
    email: string;
    celular: string;
    cpf: string;
    data_nascimento: string;
    genero_tutor: string;
    foto_perfil_tutor: string | null;
    created_at: string;
    pets?: any[];
}

interface Stats {
    pets: number;
    vacinas: number;
    consultas: number;
    produtos: number;
}

const formatarCPF = (cpf: string) => {
    if (!cpf) return 'N/A';
    const cleanCpf = cpf.replace(/\D/g, '');
    return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

const formatarCelular = (celular: string) => {
    if (!celular) return 'N/A';
    const cleanCelular = celular.replace(/\D/g, '');
    if (cleanCelular.length === 11) {
        return cleanCelular.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    return cleanCelular;
};

const formatarDataParaInput = (data: string) => {
    if (!data) return '';
    try {
        const dateObj = new Date(data);

        if (isNaN(dateObj.getTime())) {
            return '';
        }

        return dateObj.toISOString().split('T')[0];
    } catch {
        return '';
    }
}

export default function Perfil() {
    const store = useContext(StoreContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [tutorData, setTutorData] = useState<TutorData | null>(null);
    const [stats, setStats] = useState<Stats>({ pets: 0, vacinas: 0, consultas: 0, produtos: 0 });
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({nome_completo: '', email: '', celular: '', cpf: '', data_nascimento: ''});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tutorId, setTutorId] = useState<number | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [isConviteModalOpen, setIsConviteModalOpen] = useState(false);

    useEffect(() => {
        const localTutor = localStorage.getItem('tutor') || sessionStorage.getItem('tutor');
        if (localTutor) {
            const tutor = JSON.parse(localTutor);
            setTutorId(tutor.id_tutor);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (!tutorId) return;

        const fetchTutorData = async () => {
            setLoading(true);

            try {
                const response = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);
                const data: TutorData = response.data;

                const petsCount = data.pets ? data.pets.length : 0;
                let vacinasCount = 0;
                let consultasCount = 0;
                let produtosCount = 0;

                const petPromises = data.pets ? data.pets.map(async (pet: any) => {
                    const [vacinasRes, consultasRes, produtosRes] = await Promise.all([
                        axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`).catch(() => ({ data: [] })),
                        axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/consultas`).catch(() => ({ data: [] })),
                        axios.get(`http://localhost: 5000/api/pets/${pet.id_pet}/produtos`).catch(() => ({ data: [] })),
                    ]);

                    vacinasCount += vacinasRes.data.length || 0;
                    consultasCount += consultasRes.data.length || 0;
                    produtosCount += produtosRes.data.length || 0;

                }) : [];

                await Promise.all(petPromises);

                const fotoUrl = data.foto_perfil_tutor ? `http://localhost:5000/api/uploads/${data.foto_perfil_tutor}` : null;
                setImagePreview(fotoUrl);

                setTutorData(data);
                setStats({
                    pets: petsCount,
                    vacinas: vacinasCount,
                    consultas: consultasCount,
                    produtos: produtosCount,
                    
                });

                if (store) {
                    store.setNome(data.nome_completo);
                    store.setCpf(data.cpf || '');
                    store.setFotoPerfilTutor(data.foto_perfil_tutor);
                }

            } catch (erro) {
                console.error('Erro ao buscar dados do tutor:', erro);
                setError('Erro ao buscar dados do tutor.');
            } finally {
                setLoading(false);
            }
        };
        fetchTutorData()
    }, [tutorId, store]);


    useEffect(() => {
        if (isEditing && tutorData) {
            setFormData({
                nome_completo: tutorData.nome_completo || '',
                email: tutorData.email || '',
                celular: tutorData.celular || '',
                cpf: tutorData.cpf || '',
                data_nascimento: formatarDataParaInput(tutorData.data_nascimento) || '',
                genero_tutor: tutorData.genero_tutor || ''
            });
            setError('');
        }
    }, [isEditing, tutorData]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            setSelectedFile(null);
            const fotoUrl = tutorData?.foto_perfil_tutor ? `http://localhost:5000/api/uploads/${tutorData.foto_perfil_tutor}` : null;
            setImagePreview(fotoUrl);
        }
    }

    const handlePhotoUpdate = async (): Promise<string | null> => {
        if (!selectedFile || !tutorId) return tutorData?.foto_perfil_tutor || null;

        const formDataImage = new FormData();
        formDataImage.append('foto_perfil_nova', selectedFile, selectedFile.name);

        try {

            const photoResponse = await axios.put(`http://localhost:5000/api/tutores/${tutorId}/atualizar-foto`, formDataImage, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (photoResponse.status === 200 && photoResponse.data.foto_perfil_tutor) {
                    return photoResponse.data.foto_perfil_tutor;
                }
        } catch (erro) {
            console.error("Erro ao atualizar foto: ", erro);
        }

        return tutorData?.foto_perfil_tutor || null;

    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if(!tutorId) return;

        setLoading(true);

        try {
            let finalPhotoFilename = tutorData?.foto_perfil_tutor;

            if (selectedFile) {
                finalPhotoFilename = await handlePhotoUpdate();

                if (!finalPhotoFilename && selectedFile) {
                    setLoading(false);
                    return;
                }

            }

            const response = await axios.put(`http://localhost:5000/api/tutores/${tutorId}`, { ...formData, celular: formData.celular.replace(/\D/g, ''), cpf: formData.cpf.replace(/\D/g, ''), foto_perfil_tutor: finalPhotoFilename, });

            if (response.status === 200) {
                const updatedDataResponse = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);
                const updatedData: TutorData = updatedDataResponse.data;
                const newFotoUrl = updatedData.foto_perfil_tutor ? `http://localhost:5000/api/uploads/${updatedData.foto_perfil_tutor}` : null;

                setTutorData(updatedData);
                setImagePreview(newFotoUrl);
                setSelectedFile(null);

                if (store && store.setNome && store.setFotoPerfilTutor) {
                    store.setNome(updatedData.nome_completo);
                    store.setCpf(updatedData.cpf || '' );
                    store.setFotoPerfilTutor(foto_perfil_tutor || null);
                }

                setIsEditing(false);
                alert('Dados atualizados com sucesso!');
            }
        } catch (erro: any) {
            console.error('Erro ao atualizar dados do tutor:', erro);
            setError(erro.response?.data?.error || 'Erro ao atualizar dados. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({});
        setError('');
        const fotoUrl = tutorData?.foto_perfil_tutor ? `http://localhost:5000/api/uploads/${tutorData.foto_perfil_tutor}` : null;
        setImagePreview(fotoUrl);
        setSelectedFile(null);
    };

    const handleLogout = () => {
        if (window.confirm("Tem certeza que deseja sair?")) {
            localStorage.removeItem('tutor');
            sessionStorage.removeItem('tutor');
            store?.setToken('');
            navigate('/login');
            window.location.reload(); 
        }
    };

    if (loading && !tutorData) {
        return (
            <div className='perfil-page'>
            <Navbar/>
            <main className='perfil-container'>
            <p>Carregando perfil...</p>
            </main>
            </div>
        );
    }

    if (!tutorData) {
        return  (
            <div className='perfil-page'>
            <Navbar/>
            <main className='perfil-container'>
            <p>{error || 'Nenhum dado de tutor disponível.'}</p>
            </main>
            </div>
        )
    }

    const memberSince = tutorData.created_at ? new Date(tutorData.created_at).getFullYear() : 'N/A';

    return (
        <div className='perfil-page'>
            <Navbar/>
            <main className='perfil-container'>
                <div className='perfil-header'>
                    <div>
                        <h1>Meu Perfil</h1>
                        <p>Gerencie suas informações pessoais</p>
                    </div>
                    <div className='perfil-actions'>
                        {isEditing ? (
                            <>
                             <Button variant='outline' onClick={handleCancel}><X size={16}/>Cancelar</Button>
                             <Button variant='primary' onClick={handleEditSubmit as any} disabled={loading}><Check size={16}/>{loading ? 'Salvando...' : 'Salvar'}</Button>
                            </>
                        ) : (
                            <>
                            <Button variant='primary' onClick={() => setIsConviteModalOpen(true)}><UserPlus size={16}/>Convidar Tutor</Button>
                            <Button variant='primary' onClick={() => setIsEditing(true)}><Edit size={16}/>Editar Perfil</Button>
                            </>
                            
                        )}
                    </div>
                </div>

                {error && <p className='form-error'>{error}</p>}

                <Card className='tutor-summary-card'>
                    <div className='summary-main'>
                        <div className='summary-avatar'>
                            {imagePreview ? (
                                <img src={imagePreview} alt="Foto Perfil" className='avatar-image' />
                            ) : (
                                <UserCircle size={50} className='avatar-user-icon'/>
                            )}
                            {isEditing && (
                                <label htmlFor="foto_perfil_input" className='avatar-edit-icon'>
                                    <Camera size={16}/>
                                    <input type="file" id='foto_perfil_input' onChange={handleFileChange} accept='image/*' style={{display: 'none'}} />
                                </label>
                            )}
                        </div>
                        <div className='summary-details'>
                            <p className='name-title'>{tutorData.nome_completo}</p>
                            <p className='email-subtitle'>{tutorData.email}</p>
                            <div className='summary-badges'>
                                <Badge variant='default'><Users size={14}/>{stats.pets}  Pets Cadastrados</Badge>
                                <Badge variant='default'><Calendar size={14}/>  Membro desde {memberSince}</Badge>
                            </div>
                        </div>
                    </div>
                </Card>

                <form onSubmit={handleEditSubmit}>
                    <div className='main-content-perfil'>
                        <Card className='info-card'>
                            <div className='card-header-icon'>
                                <User size={20}/>
                                <div>
                                    <h4>Informações Pessoais</h4>
                                    <small>Seus dados cadastrais</small>
                                </div>
                            </div>

                            <div className='form-grid-perfil'>
                                <div className='form-group-perfil'>
                                    <label htmlFor="nome_completo">Nome Completo</label>
                                    <input type="text" id='nome_completo' name="nome_completo" value={isEditing ? formData.nome_completo : tutorData.nome_completo} disabled={!isEditing} onChange={handleChange} autoComplete="off" />
                                </div>
                                <div className='form-group-perfil'>
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id='email' name='email' value={isEditing ? formData.email : tutorData.email} disabled={!isEditing} onChange={handleChange} autoComplete="off" />
                                </div>
                                <div className='form-group-perfil'>
                                    <label htmlFor="celular">Celular</label>
                                    <input type="text" id='celular' name='celular' value={isEditing ? formData.celular : formatarCelular(tutorData.celular)} disabled={!isEditing} onChange={handleChange} autoComplete="off"/>
                                </div>
                                <div className='form-group-perfil'>
                                    <label htmlFor="data_nascimento">Data de Nascimento</label>
                                    <input type={isEditing ? "date" : "text"}
                                            id='data_nascimento'
                                            name='data_nascimento'
                                            value={isEditing ? formData.data_nascimento : formatDate(tutorData.data_nascimento)}
                                            disabled={!isEditing}
                                            onChange={handleChange}
                                            autoComplete="off"
                                     />
                                </div>
                                <div className='form-group-perfil full-width'>
                                    <label htmlFor="cpf">CPF</label>
                                    <input type="text" id='cpf' name='cpf' value={isEditing ? formData.cpf : formatarCPF(tutorData.cpf || '')} disabled={!isEditing} onChange={handleChange} autoComplete="off" />
                                </div>
                            </div>
                        </Card>

                        <Card className='info-card stats-card'>
                            <div className='card-header-icon'>
                                <FileText size={20}/>
                                <h4>Estatísticas de Uso</h4>
                            </div>
                            <div className='stats-grid'>
                                <div className='stat-item heart'>
                                    <Users size={20}/>
                                    <p>{stats.pets}</p>
                                    <span>Pets</span>
                                </div>
                                <div className='stat-item shield'>
                                    <ShieldCheck size={20}/>
                                    <p>{stats.vacinas}</p>
                                    <span>Vacinas</span>
                                </div>
                                <div className='stat-item calendar'>
                                    <Calendar size={20}/>
                                    <p>{stats.consultas}</p>
                                    <span>Consultas</span>
                                </div>
                                <div className='stat-item products'>
                                    <ShoppingBag size={20}/>
                                    <p>{stats.produtos}</p>
                                    <span>Produtos</span>
                                </div>
                            </div>
                        </Card>

                    </div>

                </form>

            </main>

            <ConvidarTutorModal
                isOpen={isConviteModalOpen}
                onClose={() => setIsConviteModalOpen(false)}
                tutorId={tutorData.id_tutor}
                pets={tutorData.pets || []}
            />

        </div>
    );
}