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
    tutorId: number;
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

export function EditarVacina({ isOpen, onClose, onVacinaAtualizada, pets, vacina, tutorId}: EditarVacinaModal) {

    const [formData, setFormData] = useState<any>({});
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    const [clinicas, setClinicas] = useState<any[]>([]);
    const [todosVeterinarios, setTodosVeterinarios] = useState<any[]>([]);
    const [veterinariosFiltrados, setVeterinariosFiltrados] = useState<any[]>([]);
    const [selectedClinica, setSelectedClinica] = useState('');

    useEffect(() => {
        if (isOpen && tutorId) {
            axios.get(`http://localhost:5000/api/tutores/${tutorId}/clinicas`)
                .then(res => setClinicas(res.data))
                .catch(err => console.error("Erro ao buscar clínicas", err));

                axios.get(`http://localhost:5000/api/tutores/${tutorId}/veterinarios`)
                .then(res => {
                    setTodosVeterinarios(res.data);
                    setVeterinariosFiltrados(res.data);
                })
                .catch(err => console.error("Erro ao buscar veterinários", err));
        }
    }, [isOpen, tutorId]);

    useEffect(() => {
        if (selectedClinica) {
            const filtrados = todosVeterinarios.filter(v => v.id_clinica === Number(selectedClinica));
            setVeterinariosFiltrados(filtrados);
            
            // Limpa o veterinário se a nova clínica escolhida não tiver esse veterinário
            if (formData.id_veterinario && !filtrados.find(v => v.id_veterinario.toString() === formData.id_veterinario.toString())) {
                setFormData((prev: any) => ({ ...prev, id_veterinario: '' }));
            }
        } else {
            setVeterinariosFiltrados(todosVeterinarios);
        }
    }, [selectedClinica, todosVeterinarios]);

    useEffect(() => {
        if (isOpen && vacina) {
            setFormData({
                id_pet: vacina.id_pet || '',
                nome_vacina: vacina.nome_vacina || '',
                data_vacinacao: formatarDataParaInput(vacina.data_vacinacao),
                proxima_dose: formatarDataParaInput(vacina.proxima_dose),
                lote: vacina.lote || '',
                id_veterinario: vacina.id_veterinario || '',
                local_aplicacao: vacina.local_aplicacao || '',
                preco_vacina: vacina.preco_vacina?.toString() || '0',
                observacoes: vacina.observacoes || '',
            });

            if (vacina.id_clinica) {
                setSelectedClinica(vacina.id_clinica.toString());
            } else {
                setSelectedClinica('');
            }

            setErro('');
            setLoading(false);
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
        if (loading) return;
        setErro('');

        if (!formData.nome_vacina || !formData.data_vacinacao || !formData.proxima_dose || !formData.lote || !formData.id_veterinario || !formData.local_aplicacao) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }
        
        if (formData.proxima_dose < formData.data_vacinacao) {
            setErro('A data da próxima dose não deve ser anterior à data de vacinação.');
            return;
        }

        setLoading(true);

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
            setLoading(false);
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
                            <div className='form-group'>
                                <label>Clínica *</label>
                                <select 
                                    value={selectedClinica} 
                                    onChange={(e) => setSelectedClinica(e.target.value)}
                                >
                                    <option value="">Selecione a clínica</option>
                                    {clinicas.map(c => (
                                        <option key={c.id_clinica} value={c.id_clinica}>{c.nome_clinica}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className='form-group'>
                                <label htmlFor="id_veterinario">Veterinário *</label>
                                <select 
                                    id='id_veterinario' 
                                    name='id_veterinario' 
                                    value={formData.id_veterinario} 
                                    onChange={handleChange}
                                    disabled={!selectedClinica}
                                >
                                    <option value="">Selecione o veterinário</option>
                                    {veterinariosFiltrados.map(v => (
                                        <option key={v.id_veterinario} value={v.id_veterinario}>
                                            {v.nome} {v.nome_clinica ? `(${v.nome_clinica})` : '(Independente)'}
                                        </option>
                                    ))}
                                </select>
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
                        <Button variant='primary' type='submit' disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )

}