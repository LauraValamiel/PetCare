import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Syringe, X } from 'lucide-react';
import '../styles/AdicionarPet.css';
import { type Pet } from '../pages/MeusPets';

interface AdicionarVacinaModal {
    isOpen: boolean;
    onClose: () => void;
    onVacinaAdded: () => void;
    pets: Pet[];
    tutorId: number;
}

const estadoInicial = {
    id_pet: '',
    nome_vacina: '',
    data_vacinacao: '',
    proxima_dose: '',
    lote: '',
    nome_veterinario: '',
    local_aplicacao: '',
    preco_vacina: '',
    observacoes: '',
};

export function AdicionarVacina({ isOpen, onClose, onVacinaAdded, pets, tutorId}: AdicionarVacinaModal) {
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

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value}));
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');

        if (!formData.id_pet || !formData.nome_vacina || !formData.data_vacinacao || !formData.proxima_dose || !formData.lote || !formData.nome_veterinario || !formData.local_aplicacao || !formData.preco_vacina) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        try {
            const response = await axios.post(`http://localhost:5000/api/pets/${formData.id_pet}/nova-vacina`, {
                ...formData,
                preco_vacina: parseFloat(formData.preco_vacina.replace(',', '.')) || 0
            });

            if (response.status === 201) {
                onVacinaAdded();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao adicionar vacina: ", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar vacina. Tente novamente.');
        }

    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><Syringe size={20}/>Adicionar Nova Vacina</h3>
                    <button onClick={onClose} className='form-close-btn'>< X size={22}/></button>
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
                                <label htmlFor="nome_vacina">Nome da Vacina *</label>
                                <input type="text" id='nome_vacina' name='nome_vacina' placeholder='Ex: V10, Antirrábica' value={formData.nome_vacina} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="data_vacinacao">Data da Aplicação *</label>
                                <input type="date" id='data_vacinacao' name='data_vacinacao' value={formData.data_vacinacao} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="proxima_dose">Próxima Dose *</label>
                                <input type="date" id='proxima_dose' name='proxima_dose' value={formData.proxima_dose} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="lote">Lote *</label>
                                <input type="text" id='lote' name='lote' placeholder='Ex: L123456' value={formData.lote} onChange={handleChange}/>
                            </div>
                            <div className='form-group full=width'>
                                <label htmlFor="nome_veterinario">Veterinário *</label>
                                <input type="text" id='nome_veterinario' name='nome_veterinario' placeholder='Ex: Dra Tuane' value={formData.nome_veterinario} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="local_aplicacao">Clínica Veterinária/Local da Aplicação *</label>
                                <input type="text" id='local_aplicacao' name='local_aplicacao' placeholder='Ex: Clínica Vet' value={formData.local_aplicacao} onChange={handleChange}/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="preco_vacina">Preço (R$) *</label>
                                <input type="text" id='preco_vacina' name='preco_vacina' placeholder='Ex: 80,00' value={formData.preco_vacina} onChange={handleChange}/>
                            </div>
                            <div className='form-group full-width'>
                                <label htmlFor="observacoes">Observações *</label>
                                <textarea id='observacoes' name='observacoes' placeholder='Ex: Reações, recomendações especiais...' value={formData.observacoes} onChange={handleChange}/>
                            </div>
                        </div>
                    </div>
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit'>Adicionar Vacina</Button>
                    </div>
                </form>
            </div>
        </div>
    )

}