import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Plus, X, Stethoscope } from 'lucide-react';
import '../styles/AdicionarPet.css';

interface AdicionarClinicaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClinicaAdded: () => void;
    tutorId: number;
}

const estadoInicial = {
    nome_clinica: '',
    endereco: '',
    telefone: '',
};

const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits; 
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export function AdicionarClinicaModal({ isOpen, onClose, onClinicaAdded,tutorId }: AdicionarClinicaModalProps) {
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

    if (!isOpen) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        setFormData(prev => ({...prev, [name]: value }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setErro('');

        if (!formData.nome_clinica || !formData.endereco || !formData.telefone) {
            setErro('Por favor, preencha todos os campos obrigatórios.');
            setLoading(false);
            return;
        }
        
        try {
            const dadosParaEnviar = {
                ...formData,
                telefone: formData.telefone.replace(/\D/g, '')
            };

            const response = await axios.post(`http://localhost:5000/api/tutores/${tutorId}/nova-clinica`, dadosParaEnviar);
            
            if (response.status === 201) {
                onClinicaAdded(); 
                onClose();
            }
        } catch (error) {
            console.error("Erro ao adicionar clínica", error);
            setErro(error.response?.data?.error || 'Erro ao conectar ao servidor.')
            
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><Stethoscope size={20}/>Adicionar Nova Clínica</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-grid'>
                            <div className='form-group full-width'>
                                <label htmlFor="nome_clinica">Nome da Clínica *</label>
                                <input 
                                    type="text" 
                                    id='nome_clinica' 
                                    name='nome_clinica' 
                                    placeholder='Ex: Clínica Vida Animal' 
                                    value={formData.nome_clinica} 
                                    onChange={handleChange} 
                                    autoComplete="off" />
                            </div>
                            <div className='form-group full-width'>
                                <label htmlFor="endereco">Endereço *</label>
                                <input 
                                    type="text" 
                                    id='endereco' 
                                    name='endereco' 
                                    placeholder='Ex: Rua Exemplo, 123' 
                                    value={formData.endereco} 
                                    onChange={handleChange} 
                                    autoComplete="off" />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="telefone">Telefone *</label>
                                <input 
                                    type="text" 
                                    id='telefone' 
                                    name='telefone' 
                                    placeholder='Ex: (99) 99999-9999' 
                                    value={formData.telefone} 
                                    onChange={(e) => setFormData({...formData, telefone: maskPhone(e.target.value)})} 
                                    maxLength={15}
                                    autoComplete="off" />
                            </div>

                        </div>
                    </div>
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit' disabled={loading}><Plus size={16}/>{loading ? 'Salvando...' : 'Adicionar Clínica'}</Button>
                    </div>
                </form>
            </div>
        </div>
    )

}