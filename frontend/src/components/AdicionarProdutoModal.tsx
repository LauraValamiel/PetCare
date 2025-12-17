import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { ShoppingBag, X } from 'lucide-react';
import '../styles/AdicionarPet.css';
import { formatDate, type Pet } from '../pages/MeusPets';

interface AdicionarProdutoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProdutoAdded: () => void;
    pets: Pet[];
    tutorId: number;
}

const estadoInicial = {
    id_pet: '',
    nome_produto: '',
    categoria: '',
    quantidade: '',
    consumo_medio: '',
    data_compra: new Date().toISOString().split('T')[0],
    preco_compra: '',
    loja: '',
    observacoes: '',
    consumo_periodo: 'dia' as 'dia' | 'semana' | 'mes' | 'ano',
};

const parseCommaFloat = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
}

export function AdicionarProdutoModal({ isOpen, onClose, onProdutoAdded, pets, tutorId }: AdicionarProdutoModalProps) {
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

    const getUnitLabel = (categoria: string, type: 'quantidade' | 'consumo_medio') => {
        const cat = categoria.toLocaleLowerCase();
        let unit = 'unidades';

        if (cat.includes('ração') || cat.includes('alimento')) {
            unit = 'kg';
        } else if (cat.includes('higiene')) {
            unit = 'litros';
        }

        if (type === 'quantidade') {
            return `Quantidade (${unit}) *`;
        }

        return `Consumo (${unit})`;

    }

    const getPlaceholder = (categoria: string, type: 'quantidade' | 'consumo_medio') => {
        const cat = categoria.toLowerCase();

        if (cat.includes('ração') || cat.includes('alimento')) {
            return type === 'quantidade' ? 'Ex: 5,0 (para kg)' : 'Ex: 0.25 (para 250g)';
        } else if (cat.includes('higiene')) {
            return type === 'quantidade' ? 'Ex: 1,0 (para 1 litro)' : 'Ex: 0.05 (para 50ml)';
        }

        return type === 'quantidade' ? 'Ex: 10' : 'Ex: 1';
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value}));
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');

        if (!formData.id_pet || !formData.nome_produto || !formData.categoria || !formData.quantidade || !formData.consumo_medio || !formData.data_compra || !formData.preco_compra || !formData.loja) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        try {
            const response = await axios.post(`http://localhost:5000/api/pets/${formData.id_pet}/novo-produto`, {
                ...formData,
                quantidade: parseCommaFloat(formData.quantidade.replace(',', '.')) || 0,
                consumo_medio: parseCommaFloat(formData.consumo_medio.replace(',', '.')) || 0,
                preco_compra: parseCommaFloat(formData.preco_compra.replace(',', '.')) || 0
            });

            if (response.status === 201) {
                onProdutoAdded();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao adicionar produto: ", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar o produto. Tente novamente.');
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><ShoppingBag size={20}/>Adicionar Novo Produto</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
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
                                <label htmlFor="nome_produto">Nome Produto *</label>
                                <input type="text" id='nome_produto' name='nome_produto' placeholder='Ex: Ração, Shampoo' value={formData.nome_produto} onChange={handleChange} />
                            </div>

                            <div className='form-group'>
                                <label htmlFor="categoria">Categoria *</label>
                                <select name="categoria" id="categoria" value={formData.categoria} onChange={handleChange}>
                                    <option value="">Selecione</option>
                                    <option value="ração">Ração/Alimento</option>
                                    <option value="medicamento">Medicamento</option>
                                    <option value="acessório">Acessório</option>
                                    <option value="higiene">Higiene</option>
                                    <option value="outros">Outros</option>
                                </select>
                            </div>

                            <div className='form-group'>
                                <label htmlFor="quantidade">{getUnitLabel(formData.categoria, 'quantidade')}</label>
                                <input type="text" id='quantidade' name='quantidade' placeholder={getPlaceholder(formData.categoria, 'quantidade')} value={formData.quantidade} onChange={handleChange} />
                            </div>

                            
                            <div className='form-group'>
                                    <label htmlFor="consumo_medio">{getUnitLabel(formData.categoria, 'consumo_medio')}</label>
                                    <input type="text" id='consumo_medio' name='consumo_medio' placeholder={getPlaceholder(formData.categoria, 'consumo_medio')} value={formData.consumo_medio} onChange={handleChange} />
                            </div>
                            
                            <div className='form-group'>
                                <label htmlFor="consumo_periodo">Período de Consumo *</label>
                                <select name="consumo_periodo" id="consumo_periodo" value={formData.consumo_periodo} onChange={handleChange}>
                                    <option value="dia">Dia</option>
                                    <option value="semana">Semana</option>
                                    <option value="mes">Mês</option>
                                    <option value="ano">Ano</option>
                                </select>
                            </div>

                            <div className='form-group'>
                                <label htmlFor="data_compra">Data da Compra *</label>
                                <input type="date" id='data_compra' name='data_compra' value={formData.data_compra} onChange={handleChange} />
                            </div>

                            <div className='form-group'>
                                <label htmlFor="preco_compra">Preço (R$) *</label>
                                <input type="text" id='preco_compra' name='preco_compra' placeholder='Ex: 120,50' value={formData.preco_compra} onChange={handleChange} />
                            </div>

                            <div className='form-group full-width'>
                                <label htmlFor="loja">Local da Compra*</label>
                                <input type="text" id='loja' name='loja' placeholder='Ex: Petz, Amazon' value={formData.loja} onChange={handleChange} />
                            </div>

                            <div className='form-group full-width'>
                                <label htmlFor="observacoes">Observações</label>
                                <textarea id='observacoes' name='observacoes' placeholder='Notas sobre o produto, validade...' value={formData.observacoes} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit'>Adicionar Produto</Button>
                    </div>
                </form>

            </div>

        </div>
    )

}