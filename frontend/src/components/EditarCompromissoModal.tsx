import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Calendar, X, Save } from 'lucide-react';
import '../styles/AdicionarPet.css'; // Reutiliza os estilos
import { type Pet } from '../pages/MeusPets';

// Interface do objeto Compromisso (Baseado no que o backend retorna)
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
    onCompromissoUpdated: () => void; // Renomeado de onCompromissoAdded
    pets: Pet[];
    compromisso: Compromisso | null; // Recebe o compromisso a ser editado
}

// Funções auxiliares para formatar data e hora vindas do banco
const formatDateToInput = (dateString: string): string => {
    if (!dateString) return '';
    try {
        // Pega apenas a parte da data YYYY-MM-DD
        return dateString.split('T')[0];
    } catch {
        return '';
    }
};

const formatTimeToInput = (timeString: string): string => {
    if (!timeString) return '';
    // Garante formato HH:MM (remove segundos se houver)
    return timeString.substring(0, 5);
};

export function EditarCompromissoModal({
    isOpen,
    onClose,
    onCompromissoUpdated,
    pets,
    compromisso
}: EditarCompromissoModalProps) {

    // Estado inicial vazio, será preenchido pelo useEffect
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

    // Determina o tipo visualmente baseado no título (opcional, apenas para UI)
    const isExame = compromisso?.titulo.toLowerCase().includes('exame');
    const modalTitle = isExame ? 'Editar Exame' : 'Editar Consulta/Compromisso';

    // PREENCHE O FORMULÁRIO QUANDO O MODAL ABRE
    useEffect(() => {
        if (isOpen && compromisso) {
            // Encontra o ID do pet com base no nome, se necessário, ou usa o que veio no objeto
            // Se o objeto compromisso não tiver id_pet direto, buscamos pelo nome
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
            // MUDANÇA PRINCIPAL: Rota PUT com ID do compromisso
            // Rota: /api/pets/<id_pet>/compromissos/<id_compromisso>
            const response = await axios.put(`http://localhost:5000/api/pets/${formData.id_pet}/compromissos/${compromisso.id_compromisso}`, {
                ...formData,
                lembrete: true
            });

            if (response.status === 200) {
                onCompromissoUpdated(); // Atualiza a lista pai
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
                            {/* O Pet fica desabilitado na edição para não quebrar a rota de ID */}
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