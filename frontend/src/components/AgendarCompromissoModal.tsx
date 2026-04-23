/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { CalendarPlus, X } from 'lucide-react';
import '../styles/AdicionarPet.css';
import { type Pet } from '../pages/MeusPets';

interface AgendarCompromissoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCompromissoAdded: () => void;
    pets: Pet[];
    tutorId: number;
    tipo: 'consulta' | 'exame' | 'outro';
}

const getEstadoInicial = (tipo: 'consulta' | 'exame' | 'outro') => ({
    id_pet: '',
    titulo: tipo === 'exame' ? 'Exame' : '',
    data_compromisso: '',
    hora:  '',
    localizacao: '',
    id_clinica: '',
    id_veterinario: '',
    descricao: '',
    lembrete: true,
});

export function AgendarCompromissoModal({
    isOpen,
    onClose,
    onCompromissoAdded,
    pets,
    tutorId,
    tipo    
}: AgendarCompromissoModalProps) {

    const [formData, setFormData] = useState(getEstadoInicial(tipo));
    const [erro, setErro] = useState('');

    const modalTitle = tipo === 'consulta' ? 'Agendar Nova Consulta' 
                     : tipo === 'exame' ? 'Agendar Novo Exame' 
                     : 'Agendar Novo Compromisso';
                     
    const tituloLabel = tipo === 'consulta' ? 'Motivo da Consulta *' 
                      : tipo === 'exame' ? 'Nome do Exame *' 
                      : 'Título do Compromisso *';
                      
    const tituloPlaceholder = tipo === 'consulta' ? 'Ex: Check-up anual, vacina' 
                            : tipo === 'exame' ? 'Ex: Exame de sangue, raio-x' 
                            : 'Ex: Banho, Tosa, Passeio...';
                            
    const localLabel = tipo === 'consulta' ? 'Clínica/Veterinário *' 
                     : tipo === 'exame' ? 'Laboratório/Clínica *' 
                     : 'Localização *';

    const [loading, setLoading] = useState(false);

    const [clinicas, setClinicas] = useState<any[]>([]);
    const [todosVeterinarios, setTodosVeterinarios] = useState<any[]>([]);
    const [veterinariosFiltrados, setVeterinariosFiltrados] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            setFormData(getEstadoInicial(tipo));
            setErro('');
            setLoading(false);
        }
    }, [isOpen, tipo]);

    useEffect(() => {
        if (isOpen && tutorId) {
            if (tipo === 'consulta' || tipo === 'exame') {
                axios.get(`http://localhost:5000/api/tutores/${tutorId}/clinicas`)
                .then(res => setClinicas(res.data))
                .catch(err => console.error("Erro ao buscar clínicas", err));
            }
            
            if (tipo === 'consulta') {
                axios.get(`http://localhost:5000/api/tutores/${tutorId}/veterinarios`)
                .then(res => {
                    setTodosVeterinarios(res.data);
                    setVeterinariosFiltrados(res.data);
                })
                .catch(err => console.error("Erro ao buscar veterinários", err));
            }
            
        }
    }, [isOpen, tutorId, tipo]);

    useEffect(() => {
        if (formData.id_clinica) {
            const filtrados = todosVeterinarios.filter(v => v.id_clinica === Number(formData.id_clinica));
            setVeterinariosFiltrados(filtrados);
            
            // Limpa o veterinário selecionado se ele não pertencer à nova clínica
            if (formData.id_veterinario && !filtrados.find(v => v.id_veterinario.toString() === formData.id_veterinario)) {
                setFormData(prev => ({...prev, id_veterinario: ''}));
            }
        } else {
            setVeterinariosFiltrados(todosVeterinarios);
        }
    }, [formData.id_clinica, todosVeterinarios]);

    if (!isOpen) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        if (name === 'titulo' && tipo === 'exame') {
            const textoSemPrefixo = value.replace(/^Exame\s*/i, '');
            setFormData(prev => ({...prev, [name]: `Exame ${textoSemPrefixo}`}));
            return;
        }
        setFormData(prev => ({...prev, [name]: value}));
    }

    const handleSubmit = async (event: React.FocusEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;
        setLoading(true);
        setErro('');

        if (!formData.id_pet || !formData.titulo || !formData.data_compromisso || !formData.hora) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            setLoading(false);
            return;
        }

        if (tipo === 'consulta' && !formData.id_veterinario) {
            setErro('Por favor, selecione pelo menos o veterinário.');
            setLoading(false);
            return;
        }

        if ((tipo === 'exame' || tipo === 'outro') && !formData.localizacao) {
            setErro(`Por favor, preencha o local do ${tipo === 'exame' ? 'exame' : 'compromisso'}.`);
            setLoading(false);
            return;
        }

        try {

            const url = tipo === 'consulta' 
                ? `http://localhost:5000/api/pets/${formData.id_pet}/nova-consulta`
                : `http://localhost:5000/api/pets/${formData.id_pet}/agendar-compromissos`;

            
            const dataToSend = tipo === 'consulta'
                ? {
                    data_consulta: formData.data_compromisso,
                    hora: formData.hora,
                    motivo: formData.titulo,
                    id_clinica: formData.id_clinica,
                    id_veterinario: formData.id_veterinario
                }
                : {
                    ...formData,
                    titulo: tipo === 'exame' && !formData.titulo.toLowerCase().includes('exame') 
                        ? `Exame: ${formData.titulo}` 
                        : formData.titulo,
                    lembrete: true,
                    enviar_notificacao: true
                }

            const response = await axios.post(url, dataToSend);
                

            if (response.status === 201) {
                onCompromissoAdded();
                onClose();
            }
 
        } catch(erro: any) {
            console.error("Erro ao agendar compromisso:", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar compromisso. Tente novamente.');
            
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><CalendarPlus size={20}/>{modalTitle}</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-group full-width'>
                            <label htmlFor="id_pet">Pet *</label>
                            <select name="id_pet" id="id_pet" value={formData.id_pet} onChange={handleChange}>
                                <option value="">Selecione o pet</option>
                                {pets.map(pet => (
                                    <option key={pet.id_pet} value={pet.id_pet}>{pet.nome_pet}</option>
                                ))}
                            </select>
                        </div>

                        <div className='form-grid'>
                            <div className='form-group'>
                                <label htmlFor="titulo">{tituloLabel}</label>
                                <input 
                                    type="text" 
                                    id='titulo'
                                    name='titulo'
                                    placeholder={tituloPlaceholder}
                                    value={formData.titulo}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    />
                            </div>

                            {tipo === 'consulta' ? (
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
                            ) : tipo === 'exame' ? (
                                <div className='form-group'>
                                    <label htmlFor="localizacao">{localLabel}</label>
                                    <select
                                        id='localizacao'
                                        name='localizacao'
                                        value={formData.localizacao}
                                        onChange={handleChange} 
                                        >
                                        <option value="">Selecione a clínica/laboratório</option>
                                        {clinicas.map(c => (
                                            <option key={c.id_clinica} value={c.nome_clinica}>{c.nome_clinica}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className='form-group'>
                                    <label htmlFor="localizacao">{localLabel}</label>
                                    <input 
                                        type="text"
                                        id='localizacao'
                                        name='localizacao'
                                        placeholder='Ex: Clínica Vet, Pet Center'
                                        value={formData.localizacao}
                                        onChange={handleChange} 
                                        autoComplete="off"
                                    />
                                </div>
                            )}

                            <div className='form-group'>
                                <label htmlFor="hora">Data *</label>
                                <input 
                                    type="date"
                                    id='data_compromisso'
                                    name='data_compromisso'
                                    value={formData.data_compromisso}
                                    onChange={handleChange}
                                    autoComplete="off"
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
                                    autoComplete="off"
                                 />
                            </div>

                            <div className='form-group full-width'>
                                <label htmlFor="descricao">Descrição/Notas *</label>
                                <textarea 
                                    name="descricao" 
                                    id="descricao"
                                    placeholder='Alguma observação? Ex: Pet deve estar em jejum.'
                                    value={formData.descricao}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    />
                            </div>
                        </div>
                        <div className='form-footer'>
                            <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                            <Button variant='primary' type='submit' disabled={loading}>{loading ? 'Agendando...' : 'Agendar'}</Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )


}