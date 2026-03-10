import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { CalendarIcon, ShoppingBag, X } from 'lucide-react';
import '../styles/AdicionarPet.css';
import { type Pet } from '../pages/MeusPets';
import type Produto from '../pages/Produtos';

const formatarDataParaInput = (data: string | undefined | null) => {
    if (!data) {
        return '';
    }

    try {
        return new Date(data).toISOString().split('T')[0];
    } catch (erro) {
        return '';
    }
};

const parseCommaFloat = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
};

const getUnitLabel = (categoria: string, type: 'quantidade' | 'consumo_medio') => {
        const catString = categoria || '';
        const cat = catString.toLocaleLowerCase();
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
        const catString = categoria || '';
        const cat = catString.toLowerCase();

        if (cat.includes('ração') || cat.includes('alimento')) {
            return type === 'quantidade' ? 'Ex: 5,0 (para kg)' : 'Ex: 0.25 (para 250g)';
        } else if (cat.includes('higiene')) {
            return type === 'quantidade' ? 'Ex: 1,0 (para 1 litro)' : 'Ex: 0.05 (para 50ml)';
        }

        return type === 'quantidade' ? 'Ex: 10' : 'Ex: 1';
}

interface EditarProdutoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProdutoUpdated: () => void;
    pets: Pet[];
    produto: Produto | null;
}

export function EditarProdutoModal({ isOpen, onClose, onProdutoUpdated, pets, produto }: EditarProdutoModalProps) {
    const [formData, setFormData] = useState<any>({});
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && produto) {
            setFormData({
                id_pet: produto.id_pet.toString() || '',
                nome_produto: produto.nome_produto || '',
                categoria: produto.categoria || '',
                quantidade: produto.quantidade?.toString()?.replace('.', ',') || '',
                consumo_medio: produto.consumo_medio?.toString()?.replace('.', ',') || '',
                data_compra: formatarDataParaInput(produto.data_compra),
                data_validade: formatarDataParaInput(produto.data_validade),
                preco_compra: produto.preco_compra?.toString()?.replace('.', ',') || '',
                loja: produto.loja || '',
                observacoes: produto.observacoes || '',
                consumo_periodo: produto.consumo_periodo || 'dia',
            });
            setErro('');
            setLoading(false);
        }
    }, [isOpen, produto]);

    if (!isOpen || !produto) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData((prev: any) => ({...prev, [name]: value }));
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;

        setErro('');
        setLoading(true);

        const permitirEmail = true;

        if (!formData.id_pet || !formData.nome_produto || !formData.categoria || !formData.quantidade || !formData.consumo_medio || !formData.data_compra || !formData.preco_compra || !formData.loja) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.put(`http://localhost:5000/api/pets/${produto.id_pet}/produtos/${produto.id_compra}`, {
                ...formData,
                quantidade: parseCommaFloat(formData.quantidade.replace(',', '.')) || 0,
                consumo_medio: parseCommaFloat(formData.consumo_medio.replace(',', '.')) || 0,
                preco_compra: parseCommaFloat(formData.preco_compra.replace(',', '.')) || 0,
                data_validade: formData.data_validade || null,
                enviar_notificacao: permitirEmail
            });

            if (response.status === 200){
                onProdutoUpdated();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao editar produto: ", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar alterações. Tente novamente.');
            setLoading(false);

        }
    };

    const petSelecionado = pets.find(p => p.id_pet === parseInt(formData.id_pet));

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><ShoppingBag size={20}/>Editar Produto</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-erro'>{erro}</p>}
                        <label htmlFor="id_pet ">Pet *</label>
                        <input type="text" id='pet_nome' name='pet_nome' value={petSelecionado?.nome_pet || `Pet ID: ${formData.id_pet}`} disabled style={{backgroundColor: '#f4f4f4', color: '#888' }} />
                    

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
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CalendarIcon size={14}/> Data de Validade
                                    </label>
                                    <input 
                                        type="date" 
                                        name='data_validade' 
                                        value={formData.data_validade} 
                                        onChange={handleChange} 
                                    />
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
                            
                            <div className='form-footer'>
                                <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                                <Button variant='primary' type='submit' disabled={loading}>
                                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                            </div>
                    </div>
                </form>

            </div>

        </div>
    )

}

