import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Syringe, X } from 'lucide-react';
import '../styles/AdicionarPet.css';
import { type Pet } from '../pages/MeusPets';
import { type VacinaDetalhada } from '../pages/CartaoVacina';

interface EditarVacinaModal {
    isOpen: boolean;
    onClose: () => void;
    onVacinaAtualizada: () => void;
    pets: Pet[];
    vacina: VacinaDetalhada | null;
}

const formatarDataParaInput = (data: string | null) => {
    if (!data) {
        return '';
    }
    try {
        
        const dateObj = new Date(data);

        if (isNaN(dateObj.getTime())) {
            return '';
        }
        
        return dateObj.toISOString().split('T')[0];
    } catch (erro) {
        return '';
    }
}

export function EditarVacina({ isOpen, onClose, onVacinaAtualizada, pets, vacina}: EditarVacinaModal) {

    const [formData, setFormData] = useState<any>({});
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (isOpen && vacina) {
            setFormData({
                id_pet: vacina.id_pet || '',
                nome_vacina: vacina.nome_vacina || '',
                data_vacinacao: formatarDataParaInput(vacina.data_vacinacao),
                proxima_dose: formatarDataParaInput(vacina.proxima_dose),
                lote: vacina.lote || '',
                nome_veterinario: vacina.nome_veterinario || '',
                local_aplicacao: vacina.local_aplicacao || '',
                preco_vacina: vacina.preco_vacina?.toString() || '0',
                observacoes: vacina.observacoes || '',
            });
            setErro('');
        }
    }, [isOpen, vacina]);

    if (!isOpen) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData((prev: any) => ({ ...prev, [name]: value}));
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');
        
        if (formData.proxima_dose < formData.data_vacinacao) {
            setErro('A data da próxima dose não deve ser anterior à data de vacinação.');
            return;
        }

        try {
            const response = await axios.put(`http://localhost:5000/api/pets/${vacina.id_pet}/editar-vacina/${vacina?.id_vacina}`, {
                ...formData,
                preco_vacina: parseFloat(formData.preco_vacina.replace(',', '.')) || 0
            });

            if (response.status === 200) {
                onVacinaAtualizada();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao editar vacina: ", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar vacina. Tente novamente.');
        }

    };

    const petSelecionado = pets.find(p => p.id_pet === vacina?.id_pet);

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><Syringe size={20}/>Editar Vacina</h3>
                    <button onClick={onClose} className='form-close-btn'>< X size={22}/></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-group full-width'>
                            <label htmlFor="id_pet">Pet *</label>
                            <input type="text" id='pet_nome' name='pet_nome' value={petSelecionado?.nome_pet || `Pet ID: ${vacina?.id_pet}`} disabled style={{backgroundColor: '#f4f4f4', color:'#888'}} />
                        </div>

                        <div className='form-grid'>
                            <div className='form-group'>
                                <label htmlFor="nome_vacina">Nome da Vacina *</label>
                                <input type="text" id='nome_vacina' name='nome_vacina' value={formData.nome_vacina} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="data_vacinacao">Data da Aplicação *</label>
                                <input type="date" id='data_vacinacao' name='data_vacinacao' value={formData.data_vacinacao} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="proxima_dose">Próxima Dose *</label>
                                <input type="date" id='proxima_dose' name='proxima_dose' value={formData.proxima_dose} min={formData.data_vacinacao} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="lote">Lote *</label>
                                <input type="text" id='lote' name='lote' value={formData.lote} onChange={handleChange}/>
                            </div>
                            <div className='form-group full=width'>
                                <label htmlFor="nome_veterinario">Veterinário/Clínica *</label>
                                <input type="text" id='nome_veterinario' name='nome_veterinario' value={formData.nome_veterinario} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="local_aplicacao">Clínica Veterinária/Local da Aplicação *</label>
                                <input type="text" id='local_aplicacao' name='local_aplicacao' value={formData.local_aplicacao} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="preco_vacina">Preço (R$) *</label>
                                <input type="text" id='preco_vacina' name='preco_vacina' value={formData.preco_vacina} onChange={handleChange}/>
                            </div>
                            <div className='form-group full-width'>
                                <label htmlFor="observacoes">Observações *</label>
                                <input id='observacoes' name='observacoes' value={formData.observacoes} onChange={handleChange}/>
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