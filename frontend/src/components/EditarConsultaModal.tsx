import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, FileText } from 'lucide-react';
import { Button } from './button';
import '../styles/AdicionarPet.css';

const formatDateToInput = (dateString: string | Date | null): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return String(dateString).substring(0, 10);
    }
};

const formatTime = (timeString: string | null): string => {
    if (!timeString) return '';
    return String(timeString).substring(0, 5);
};


interface Consulta {
    id_consulta: number;
    data_consulta: string;
    hora: string;
    motivo: string;
    diagnostico: string;
    tratamento: string;
    nome_clinica: string;
    nome_veterinario: string;
    preco_consulta: number;
}

interface EditarConsultaModalProps {
    isOpen: boolean;
    onClose: () => void;
    consulta: Consulta | null;
    idPet: string | number;
    onSuccess?: () => void;
}

export function EditarConsultaModal({ isOpen, onClose, consulta, idPet, onSuccess }: EditarConsultaModalProps) {
    
    const [formData, setFormData] = useState({
        data_consulta: '',
        hora: '',
        motivo: '',
        diagnostico: '',
        tratamento: '',
        nome_clinica: '',
        nome_veterinario: '',
        preco_consulta: '',
    });
    const [erro, setErro] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    
    useEffect(() => {
        if (isOpen && consulta) {
            setFormData({
                data_consulta: formatDateToInput(consulta.data_consulta),
                hora: formatTime(consulta.hora), 
                motivo: consulta.motivo || '',
                diagnostico: consulta.diagnostico || '',
                tratamento: consulta.tratamento || '',
                nome_clinica: consulta.nome_clinica || '',
                nome_veterinario: consulta.nome_veterinario || '',
                preco_consulta: consulta.preco_consulta?.toString() || '',
            });
            setErro('');
        }
    }, [isOpen, consulta]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErro('');
        setIsSaving(true);

        if (!formData.data_consulta || !formData.motivo) {
            setErro('Data e Motivo são obrigatórios.');
            setIsSaving(false);
            return;
        }

        try {
            const url = `http://localhost:5000/api/pets/${idPet}/editar-consulta/${consulta?.id_consulta}`;
            
            
            const payload = {
                ...formData,
                preco_consulta: parseFloat(formData.preco_consulta.replace(',', '.')) || 0
            };

            const response = await axios.put(url, payload);

            if (response.status === 200) {
                alert('Registro atualizado com sucesso!');
                if (onSuccess) onSuccess();
                onClose();
            }
        } catch (error: any) {
            console.error('Erro ao editar consulta:', error);
            setErro(error.response?.data?.error || 'Erro ao atualizar. Verifique os dados.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !consulta) return null;

    return (
        <div className='form' onClick={onClose}> 
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><FileText size={20}/> Editar Histórico Médico</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-grid'>
                            <div className="form-group">
                                <label htmlFor="data_consulta">Data *</label>
                                <input
                                    type="date"
                                    id="data_consulta"
                                    name="data_consulta"
                                    value={formData.data_consulta}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="hora">Hora</label>
                                <input
                                    type="time"
                                    id="hora"
                                    name="hora"
                                    value={formData.hora}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="motivo">Motivo / Título *</label>
                                <input
                                    type="text"
                                    id="motivo"
                                    name="motivo"
                                    value={formData.motivo}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="nome_clinica">Clínica / Local</label>
                                <input
                                    type="text"
                                    id="nome_clinica"
                                    name="nome_clinica"
                                    value={formData.nome_clinica}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="nome_veterinario">Veterinário</label>
                                <input
                                    type="text"
                                    id="nome_veterinario"
                                    name="nome_veterinario"
                                    value={formData.nome_veterinario}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="diagnostico">Diagnóstico</label>
                                <textarea
                                    id="diagnostico"
                                    name="diagnostico"
                                    value={formData.diagnostico}
                                    onChange={handleChange}
                                    rows={2}
                                />
                            </div>
                            <div className="form-group full-width">
                                <label htmlFor="tratamento">Tratamento</label>
                                <textarea
                                    id="tratamento"
                                    name="tratamento"
                                    value={formData.tratamento}
                                    onChange={handleChange}
                                    rows={2}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="preco_consulta">Custo (R$)</label>
                                <input
                                    type="text"
                                    id="preco_consulta"
                                    name="preco_consulta"
                                    value={formData.preco_consulta}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit' disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}