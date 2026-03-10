import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { X, UserCheck } from 'lucide-react';
import '../styles/AdicionarPet.css';

interface Clinica {
    id_clinica: number;
    nome_clinica: string;
}

interface Veterinario {
    id_veterinario: number;
    nome: string;
    especialidade?: string;
    telefone?: string;
    id_clinica?: number;
}

interface EditarVeterinarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVeterinarioUpdated: () => void;
    veterinario: Veterinario | null;
    clinicas: Clinica[];
}

const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits; 
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export function EditarVeterinarioModal({ isOpen, onClose, onVeterinarioUpdated, veterinario, clinicas }: EditarVeterinarioModalProps) {
    const [formData, setFormData] = useState({
        nome: '',
        especialidade: '',
        telefone: '',
        id_clinica: '',
    });
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && veterinario) {
            setFormData({
                nome: veterinario.nome || '',
                especialidade: veterinario.especialidade || '',
                telefone: veterinario.telefone ? maskPhone(veterinario.telefone) : '',
                id_clinica: veterinario.id_clinica ? veterinario.id_clinica.toString() : '',
            });
            setErro('');
            setLoading(false);
        }
    }, [isOpen, veterinario]);

    if (!isOpen || !veterinario) return null;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        setFormData(prev => ({...prev, [name]: value}));
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
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

            const response = await axios.put(`http://localhost:5000/api/veterinario/${veterinario.id_veterinario}`, dadosParaEnviar);

            if (response.status === 200) {
                onVeterinarioUpdated();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao editar veterinário: ", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar alterações. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><UserCheck size={20}/>Editar Veterinário</h3>
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
                                    value={formData.nome} 
                                    onChange={handleChange} 
                                    autoComplete="off" 
                                />
                            </div>
                            
                            <div className='form-group full-width'>
                                <label htmlFor="id_clinica">Vincular a uma Clínica</label>
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
                                <label htmlFor="especialidade">Especialidade</label>
                                <input 
                                    type="text" 
                                    name="especialidade" 
                                    id="especialidade" 
                                    value={formData.especialidade} 
                                    onChange={handleChange} 
                                    autoComplete="off" 
                                />
                            </div>

                            <div className='form-group'>
                                <label htmlFor="telefone">Telefone</label>
                                <input 
                                    type="text" 
                                    id='telefone' 
                                    name='telefone' 
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
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}