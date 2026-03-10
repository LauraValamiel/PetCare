import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Calendar, X, Save } from 'lucide-react';
import '../styles/AdicionarPet.css';
import { type Pet } from '../pages/MeusPets';

interface Compromisso {
    id_compromisso?: number;
    id_consulta?: number;
    id_pet: number;
    titulo: string;
    data_compromisso: string;
    hora: string;
    localizacao: string;
    id_clinica?: number | string;
    id_veterinario?: number | string;
    descricao: string;
    pet_nome?: string;
    origem?: 'consulta' | 'compromisso';
}

interface EditarCompromissoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCompromissoUpdated: () => void;
    pets: Pet[];
    compromisso: Compromisso | null;
    tutorId?: number;
}

const formatDateToInput = (dateString: string): string => {
    if (!dateString) return '';
    try {
        return dateString.split('T')[0];
    } catch {
        return '';
    }
};

const formatTimeToInput = (timeString: string): string => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
};

export function EditarCompromissoModal({
    isOpen,
    onClose,
    onCompromissoUpdated,
    pets,
    compromisso,
    tutorId
}: EditarCompromissoModalProps) {

    const [formData, setFormData] = useState({
        id_pet: '',
        titulo: '',
        data_compromisso: '',
        hora: '',
        localizacao: '',
        id_clinica: '',
        id_veterinario: '',
        descricao: '',
        lembrete: true,
    });
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    const [clinicas, setClinicas] = useState<any[]>([]);
    const [todosVeterinarios, setTodosVeterinarios] = useState<any[]>([]);
    const [veterinariosFiltrados, setVeterinariosFiltrados] = useState<any[]>([]);

    const isExame = compromisso?.titulo.toLowerCase().includes('exame');
    const modalTitle = isExame ? 'Editar Exame' : 'Editar Consulta/Compromisso';

    const isConsultaReal = !!compromisso?.id_consulta;

    useEffect(() => {
        if (isOpen && tutorId && isConsultaReal) {
            axios.get(`http://localhost:5000/api/tutores/${tutorId}/clinicas`)
                .then(res => setClinicas(res.data))
                .catch(err => console.error("Erro ao buscar clínicas", err));

            axios.get(`http://localhost:5000/api/tutores/${tutorId}/veterinarios`)
                .then(res => {
                    setTodosVeterinarios(res.data);
                    setVeterinariosFiltrados(res.data);
                })
                .catch(err => console.error("Erro ao buscar veterinários", err));
        }
    }, [isOpen, tutorId, isConsultaReal]);

    useEffect(() => {
        if (formData.id_clinica) {
            const filtrados = todosVeterinarios.filter(v => v.id_clinica === Number(formData.id_clinica));
            setVeterinariosFiltrados(filtrados);
            
            if (formData.id_veterinario && !filtrados.find(v => v.id_veterinario.toString() === formData.id_veterinario.toString())) {
                setFormData(prev => ({...prev, id_veterinario: ''}));
            }
        } else {
            setVeterinariosFiltrados(todosVeterinarios);
        }
    }, [formData.id_clinica, todosVeterinarios]);

    useEffect(() => {
        if (isOpen && compromisso) {
            let petId = compromisso.id_pet?.toString();
            if (!petId && compromisso.pet_nome) {
                const petEncontrado = pets.find(p => p.nome_pet === compromisso.pet_nome);
                if (petEncontrado) petId = petEncontrado.id_pet.toString();
            }

            setFormData({
                id_pet: petId || '',
                titulo: compromisso.titulo || (compromisso as any).motivo || '',
                data_compromisso: formatDateToInput(compromisso.data_compromisso),
                hora: formatTimeToInput(compromisso.hora),
                localizacao: compromisso.localizacao || (compromisso as any).nome_clinica || '',
                id_clinica: (compromisso as any).id_clinica?.toString() || '',
                id_veterinario: (compromisso as any).id_veterinario?.toString() || '',
                descricao: (compromisso as any).descricao || (compromisso as any).motivo || '',
                lembrete: true,
            });
            setErro('');
            setLoading(false);
        }
    }, [isOpen, compromisso, pets]);

    if (!isOpen || !compromisso) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        if (name === 'titulo' && isExame) {
            const textoSemPrefixo = value.replace(/^Exame\s*/i, '');
            setFormData(prev => ({...prev, [name]: `Exame ${textoSemPrefixo}`}));
            return;
        }
        setFormData(prev => ({...prev, [name]: value}));
    }

    const handleSubmit = async (event: React.FocusEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;
        setErro('');

        if (!formData.titulo || !formData.data_compromisso || !formData.hora) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        if (isConsultaReal &&  !formData.id_veterinario) {
            setErro('Por favor, selecione pelo menos o veterinário.');
            return;
        }

        if (!isConsultaReal && !formData.localizacao) {
            setErro('Por favor, preencha a localização.');
            return;
        }

        setLoading(true);

        try {
            const isConsultaReal = !!compromisso.id_consulta;
        
            const idAtual = isConsultaReal ? compromisso.id_consulta : compromisso.id_compromisso;

            const url = isConsultaReal 
                ? `http://localhost:5000/api/pets/${formData.id_pet}/editar-consulta/${idAtual}`
                : `http://localhost:5000/api/pets/${formData.id_pet}/compromissos/${idAtual}`;

            const dataToSend = isConsultaReal
                ? {
                    data_consulta: formData.data_compromisso,
                    hora: formData.hora,
                    motivo: formData.titulo, 
                    descricao: formData.descricao,
                    id_clinica: formData.id_clinica,
                    id_veterinario: formData.id_veterinario, 
                }
                : {
                    ...formData,
                    lembrete: true
                };

            const response = await axios.put(url, dataToSend);

            if (response.status === 200) {
                onCompromissoUpdated();
                onClose();
            }
 
        } catch(erro: any) {
            console.error("Erro ao editar compromisso:", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar alterações. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><Calendar size={20}/>{modalTitle}</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-group full-width'>
                            <label htmlFor="id_pet">Pet</label>
                            <select 
                                name="id_pet" 
                                id="id_pet" 
                                value={formData.id_pet} 
                                onChange={handleChange}
                                disabled 
                                style={{backgroundColor: '#f0f0f0', cursor: 'not-allowed'}}
                            >
                                <option value="">Selecione o pet</option>
                                {pets.map(pet => (
                                    <option key={pet.id_pet} value={pet.id_pet}>{pet.nome_pet}</option>
                                ))}
                            </select>
                        </div>

                        <div className='form-grid'>
                            <div className='form-group'>
                                <label htmlFor="titulo">Título / Motivo *</label>
                                <input 
                                    type="text" 
                                    id='titulo'
                                    name='titulo'
                                    value={formData.titulo}
                                    onChange={handleChange}
                                />
                            </div>

                            {isConsultaReal ? (
                                <>
                                    <div className='form-group'>
                                        <label htmlFor="id_clinica">Clínica *</label>
                                        <select name="id_clinica" id="id_clinica" value={formData.id_clinica} onChange={handleChange}>
                                            <option value="">Selecione a clínica</option>
                                            {clinicas.map(c => (
                                                <option key={c.id_clinica} value={c.id_clinica}>{c.nome_clinica}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className='form-group'>
                                        <label htmlFor="id_veterinario">Veterinário *</label>
                                        <select name="id_veterinario" id="id_veterinario" value={formData.id_veterinario} onChange={handleChange}>
                                            <option value="">Selecione o veterinário</option>
                                            {veterinariosFiltrados.map(v => (
                                                <option key={v.id_veterinario} value={v.id_veterinario}>
                                                    {v.nome} {v.nome_clinica ? `(${v.nome_clinica})` : '(Independente)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div className='form-group'>
                                    <label htmlFor="localizacao">Localização *</label>
                                    <input 
                                        type="text"
                                        id='localizacao'
                                        name='localizacao'
                                        value={formData.localizacao}
                                        onChange={handleChange} 
                                    />
                                </div>
                            )}

                            <div className='form-group'>
                                <label htmlFor="data_compromisso">Data *</label>
                                <input 
                                    type="date"
                                    id='data_compromisso'
                                    name='data_compromisso'
                                    value={formData.data_compromisso}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className='form-group'>
                                <label htmlFor="hora">Hora *</label>
                                <input 
                                    type="time"
                                    id='hora'
                                    name='hora'
                                    value={formData.hora}
                                    onChange={handleChange}
                                 />
                            </div>

                            <div className='form-group full-width'>
                                <label htmlFor="descricao">Descrição/Notas</label>
                                <textarea 
                                    name="descricao" 
                                    id="descricao"
                                    value={formData.descricao}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className='form-footer'>
                            <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                            <Button variant='primary' type='submit' disabled={loading}>
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}