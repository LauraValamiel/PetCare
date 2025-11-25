import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { X, Stethoscope } from 'lucide-react';
import '../styles/AdicionarPet.css';

interface Clinica {
    id_clinica: number;
    nome_clinica: string;
    endereco: string;
    telefone: string;
    email: string;
}

interface EditarClinicaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClinicaUpdated: () => void;
    clinica: Clinica | null;
}

export function EditarClinicaModal({ isOpen, onClose, onClinicaUpdated, clinica}: EditarClinicaModalProps) {
    const [formData, setFormData] = useState<Omit<Clinica, 'id_clinica'> | any> ({});
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (isOpen && clinica) {
            setFormData({
                nome_clinica: clinica.nome_clinica,
                endereco: clinica.endereco,
                telefone: clinica.telefone,
                email: clinica.email,
            });
            setErro('');
        }
    }, [isOpen, clinica]);

    if (!isOpen || !clinica) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData((prev: any) => ({...prev, [name]: value}))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');

        if (!formData.nome_clinica || !formData.endereco || !formData.telefone ||!formData.email) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        try {
            const response = await axios.put(`http://localhost:5000/api/clinica/${clinica.id_clinica}`, formData);

            if (response.status === 200) {
                onClinicaUpdated();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao editar clínica: ", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar alterações. Tente novamente.');
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><Stethoscope size={20}/>Editar Clínica</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>  

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-grid'>
                            <div className='form-group full-width'>
                                <label htmlFor="nome_clinica">Nome da Clínica *</label>
                                <input type="text" id='nome_clinica' name='nome_clinica' value={formData.nome_clinica || ""} onChange={handleChange} />
                            </div>
                            <div className='form-group full-width'>
                                <label htmlFor="endereco">Endereço *</label>
                                <input type="text" name="endereco" id="endereco" value={formData.endereco || ''} onChange={handleChange} />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="telefone">Telefone *</label>
                                <input type="text" id='telefone' name='telefone' value={formData.telefone || ''} onChange={handleChange} />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="email">E-mail *</label>
                                <input type="email" id='email' name='email' value={formData.email || ''} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit'>Salvar Alterações</Button>
                    </div>
                </form>
            </div>
        </div>
    )

}