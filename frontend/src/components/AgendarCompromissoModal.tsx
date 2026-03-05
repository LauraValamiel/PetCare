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
    tipo: 'consulta' | 'exame';
}

const getEstadoInicial = (tipo: 'consulta' | 'exame') => ({
    id_pet: '',
    titulo: tipo === 'exame' ? 'Exame' : '',
    data_compromisso: '',
    hora:  '',
    localizacao: '',
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

    const modalTitle = tipo === 'consulta' ? 'Agendar Nova Consulta' : 'Agendar Novo Exame';
    const tituloLabel = tipo === 'consulta' ? 'Motivo da Consulta *' : 'Nome do Exame*';
    const tituloPlaceholder = tipo === 'consulta' ? 'Ex: Check-up anual, vacina' : 'Ex: Exame de sangue, raio-x';
    const localLabel = tipo === 'consulta' ? 'Clínica/Veterinário *' : 'Laboratório/Clínica *';
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(getEstadoInicial(tipo));
            setErro('');
        }
    }, [isOpen, tipo]);

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

        if (!formData.id_pet || !formData.titulo || !formData.data_compromisso || !formData.hora || !formData.localizacao) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        let tituloAjustado = formData.titulo;
        if (tipo === 'exame' && !formData.titulo.toLowerCase().includes('exame')){
            tituloAjustado = `Exame: ${formData.titulo}`;
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
                    nome_clinica: formData.localizacao
                }
                : {
                    ...formData,
                    titulo: tituloAjustado,
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