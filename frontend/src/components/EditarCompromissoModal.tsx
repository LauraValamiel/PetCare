import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Calendar, X, Save } from 'lucide-react';
import '../styles/AdicionarPet.css';
import { type Pet } from '../pages/MeusPets';

interface Compromisso {
    id_compromisso: number;
    id_pet: number;
    titulo: string;
    data_compromisso: string;
    hora: string;
    localizacao: string;
    descricao: string;
    pet_nome?: string;
}

interface EditarCompromissoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCompromissoUpdated: () => void;
    pets: Pet[];
    compromisso: Compromisso | null;
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
    compromisso
}: EditarCompromissoModalProps) {

    const [formData, setFormData] = useState({
        id_pet: '',
        titulo: '',
        data_compromisso: '',
        hora: '',
        localizacao: '',
        descricao: '',
        lembrete: true,
    });
    const [erro, setErro] = useState('');

    const isExame = compromisso?.titulo.toLowerCase().includes('exame');
    const modalTitle = isExame ? 'Editar Exame' : 'Editar Consulta/Compromisso';

    useEffect(() => {
        if (isOpen && compromisso) {
            let petId = compromisso.id_pet?.toString();
            if (!petId && compromisso.pet_nome) {
                const petEncontrado = pets.find(p => p.nome_pet === compromisso.pet_nome);
                if (petEncontrado) petId = petEncontrado.id_pet.toString();
            }

            setFormData({
                id_pet: petId || '',
                titulo: compromisso.titulo,
                data_compromisso: formatDateToInput(compromisso.data_compromisso),
                hora: formatTimeToInput(compromisso.hora),
                localizacao: compromisso.localizacao || '',
                descricao: compromisso.descricao || '',
                lembrete: true,
            });
            setErro('');
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
        setErro('');

        if (!formData.titulo || !formData.data_compromisso || !formData.hora || !formData.localizacao) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        try {
            const response = await axios.put(`http://localhost:5000/api/pets/${formData.id_pet}/compromissos/${compromisso.id_compromisso}`, {
                ...formData,
                lembrete: true
            });

            if (response.status === 200) {
                onCompromissoUpdated();
                onClose();
            }
 
        } catch(erro: any) {
            console.error("Erro ao editar compromisso:", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar alterações. Tente novamente.');
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
                            <Button variant='primary' type='submit'><Save size={18} style={{marginRight: 8}}/>Salvar Alterações</Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}