import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Plus, X, UserPlus } from 'lucide-react';
import '../styles/AdicionarPet.css';

interface Clinica {
    id_clinica: number;
    nome_clinica: string;
}

interface AdicionarVeterinarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVeterinarioAdded: () => void;
    tutorId: number;
    clinicas: Clinica[];
}

const estadoInicial = {
    nome: '',
    especialidade: '',
    telefone: '',
    id_clinica: '', // Vazio significa sem vínculo
};

const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits; 
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export function AdicionarVeterinarioModal({ isOpen, onClose, onVeterinarioAdded, tutorId, clinicas }: AdicionarVeterinarioModalProps) {
    const [formData, setFormData] = useState(estadoInicial);
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setFormData(estadoInicial);
            setErro('');
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        setFormData(prev => ({...prev, [name]: value }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setErro('');

        if (!formData.nome) {
            setErro('O nome do veterinário é obrigatório.');
            return;
        }
        
        setLoading(true);

        try {
            const dadosParaEnviar = {
                ...formData,
                telefone: formData.telefone.replace(/\D/g, ''),
                id_clinica: formData.id_clinica === '' ? null : Number(formData.id_clinica)
            };

            const response = await axios.post(`http://localhost:5000/api/tutores/${tutorId}/novo-veterinario`, dadosParaEnviar);
            
            if (response.status === 201) {
                onVeterinarioAdded(); 
                onClose();
            }
        } catch (error: any) {
            console.error("Erro ao adicionar veterinário", error);
            setErro(error.response?.data?.error || 'Erro ao conectar ao servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><UserPlus size={20}/>Adicionar Veterinário</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-grid'>
                            <div className='form-group full-width'>
                                <label htmlFor="nome">Nome do Veterinário *</label>
                                <input 
                                    type="text" 
                                    id='nome' 
                                    name='nome' 
                                    placeholder='Ex: Dr. Carlos Silva' 
                                    value={formData.nome} 
                                    onChange={handleChange} 
                                    autoComplete="off" 
                                />
                            </div>
                            
                            <div className='form-group full-width'>
                                <label htmlFor="id_clinica">Vincular a uma Clínica (Opcional)</label>
                                <select 
                                    id="id_clinica" 
                                    name="id_clinica" 
                                    value={formData.id_clinica} 
                                    onChange={handleChange}
                                >
                                    <option value="">-- Sem vínculo com clínica (Atendimento Autônomo) --</option>
                                    {clinicas.map(c => (
                                        <option key={c.id_clinica} value={c.id_clinica}>{c.nome_clinica}</option>
                                    ))}
                                </select>
                            </div>

                            <div className='form-group'>
                                <label htmlFor="especialidade">Especialidade (Opcional)</label>
                                <input 
                                    type="text" 
                                    id='especialidade' 
                                    name='especialidade' 
                                    placeholder='Ex: Clínico Geral, Dermatologia' 
                                    value={formData.especialidade} 
                                    onChange={handleChange} 
                                    autoComplete="off" 
                                />
                            </div>

                            <div className='form-group'>
                                <label htmlFor="telefone">Telefone / Celular (Opcional)</label>
                                <input 
                                    type="text" 
                                    id='telefone' 
                                    name='telefone' 
                                    placeholder='Ex: (99) 99999-9999' 
                                    value={formData.telefone} 
                                    onChange={(e) => setFormData({...formData, telefone: maskPhone(e.target.value)})} 
                                    maxLength={15}
                                    autoComplete="off" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit' disabled={loading}>
                            <Plus size={16}/>{loading ? 'Salvando...' : 'Adicionar Veterinário'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}