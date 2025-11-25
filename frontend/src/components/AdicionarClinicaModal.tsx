import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Plus, X, Stethoscope } from 'lucide-react';
import '../styles/AdicionarPet.css';

interface AdicionarClinicaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClinicaAdded: () => void;
}

const estadoInicial = {
    nome_clinica: '',
    endereco: '',
    telefone: '',
    email: '',
};

export function AdicionarClinicaModal({ isOpen, onClose, onClinicaAdded }: AdicionarClinicaModalProps) {
    const [formData, setFormData] = useState(estadoInicial);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setFormData(estadoInicial);
            setErro('');
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        setFormData(prev => ({...prev, [name]: value }));
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');
        
        if (!formData.nome_clinica || !formData.endereco || !formData.telefone || !formData.email) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        try {
            const response = await axios.post(`http://localhost:5000/api/nova-clinica`, formData);

            if (response.status === 201) {
                onClinicaAdded();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao adicionar a clínica: ", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar clínica. Tente novamente.')
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
                                <input type="text" id='nome_clinica' name='nome_clinica' placeholder='Ex: Clínica Vida Animal' value={formData.nome_clinica} onChange={handleChange} />
                            </div>
                            <div className='form-group full-width'>
                                <label htmlFor="endereco">Endereço *</label>
                                <input type="text" id='endereco' name='endereco' placeholder='Ex: Rua Exemplo, 123' value={formData.endereco} onChange={handleChange} />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="telefone">Telefone *</label>
                                <input type="text" id='telefone' name='telefone' placeholder='Ex: (99) 99999-9999' value={formData.telefone} onChange={handleChange} />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="email">E-mail *</label>
                                <input type="email" id='email' name='email' placeholder='EX: contato@clinica.com' value={formData.email} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit'><Plus size={16}/>Adicionar Clínica</Button>
                    </div>
                </form>
            </div>
        </div>
    )

}