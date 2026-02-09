import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/card';
import { Button } from '../components/button';
import { Plus, ShoppingBag, Heart, Activity, Calendar, DollarSign, MapPin, Syringe, Edit, Trash2 } from 'lucide-react';
import { Badge } from '../components/badge';
import { Navbar } from '../components/navbar';
import { type Pet, type Tutor, primeiraLetraMaiuscula, formatDate } from './MeusPets';
import { AdicionarClinicaModal } from '../components/AdicionarClinicaModal';
import '../styles/Produtos.css';
import { AdicionarProdutoModal } from '../components/AdicionarProdutoModal';
import { EditarProdutoModal } from '../components/EditarProdutoModal';
import StoreContext from '../components/store/Context';
import { type Notificacao } from '../components/store/Context';

interface Produto {
    id_compra: number;
    id_pet: number;
    nome_produto: string;
    categoria: string;
    quantidade: number;
    consumo_medio: number;
    data_compra: string;
    preco_compra: number;
    loja: string;
    observacoes: string;
    pet_nome?: string;
    consumo_periodo?: 'dia' | 'semana' | 'mes' | 'ano';
}

interface PrevisaoItem extends Produto {
    dias_restantes: number;
    previsao_termino: string;
    status_prev: 'urgente' | 'baixo' | 'planejado';
}

const formatarDiasRestantes = (dias: number): string => {
    if (dias === Infinity) {
            return 'Estoque indefinido';
    }
    if (dias <= 0){
        return 'Esgotado';
    }
    if (dias >= 30.4375) {
        const meses = Math.floor(dias / 30.4375);
        return meses === 1 ? 'Cerca de 1 mês' : `Cerca de  ${meses} meses`;
    }
    if (dias >=7) {
        const semanas = Math.floor(dias / 7);
        return semanas === 1 ? 'Cerca de 1 semana' : `Cerca de ${semanas} semanas`;
    }

    return `${Math.ceil(dias)} dias`;

}

const calcularPrevisaoEStatus = (produto: Produto): PrevisaoItem => {

    const quantidadeNumerica = Number(produto.quantidade);
    const consumoMedioNumerico = Number(produto.consumo_medio);

    let consumoDiario = consumoMedioNumerico;
    const consumoPeriodo = produto.consumo_periodo || 'dia';

    if (consumoPeriodo === 'semana') {
        consumoDiario = consumoMedioNumerico / 7;
    } else if (consumoPeriodo === 'mes') {
        consumoDiario = consumoMedioNumerico / 30.4375;
    } else if (consumoPeriodo === 'ano') {
        consumoDiario = consumoMedioNumerico / 365.25;
    }
    
    let diasRestantes = Infinity;
    let previsaoTermino = 'N/A';

    if (quantidadeNumerica <= 0) {
        diasRestantes = 0;
        previsaoTermino = 'Esgotado';
    } else if (consumoDiario <= 0) {
        diasRestantes = Infinity;
        previsaoTermino = 'Estoque suficiente';
    } else {
        diasRestantes = quantidadeNumerica / consumoDiario;
        const today = new Date();
        const previsaoTerminoDate = new Date(today.getTime() + (diasRestantes * 24 * 60 * 60 * 1000));
        previsaoTermino = formatDate(previsaoTerminoDate.toISOString());
    }

    const diasParaComparacao = Math.floor(diasRestantes);

    let status_prev: PrevisaoItem['status_prev'];
    if(diasParaComparacao <= 0) {
        status_prev = 'urgente';
    }else if (diasParaComparacao <= 7) {
        status_prev = 'urgente';
    } else if (diasParaComparacao <=14) {
        status_prev = 'baixo';
    } else {
        status_prev = 'planejado';
    }

    return {
        ...produto,
        dias_restantes: diasParaComparacao,
        previsao_termino: previsaoTermino,
        status_prev: status_prev
    };
};

export default function Produtos() {
    const navigate = useNavigate();
    const [tutor, setTutor] = useState<Tutor | null>(() => {
        const savedTutorLocal = localStorage.getItem('tutor');
        if (savedTutorLocal) {
            return JSON.parse(savedTutorLocal);
        }
        const savedTutorSession = sessionStorage.getItem('tutor');
        return savedTutorSession ? JSON.parse(savedTutorSession) : null;
    });

    const [loading, setLoading] = useState(false);
    const [pets, setPets] = useState<Pet[]>([]);
    const [allProdutos, setAllProdutos] = useState<Produto[]>([]);
    const [previsaoDeCompras, setPrevisaoDeCompras] = useState<PrevisaoItem[]>([]);
    const [refreshData, setRefreshData] = useState(0);

    const store = useContext(StoreContext);
    const setNotifications = store?.setNotificacoes;

    const [isAdicionarProdutoModalOpen, setIsAdicionarProdutoModalOpen] = useState(false);

    const [racaoTotalComDetalhes, setRacaoTotalComDetalhes] = useState<PrevisaoItem[]>([]);
    const [medicamentosTotalComDetalhes, setMedicamentosTotalComDetalhes] = useState<PrevisaoItem[]>([]);
    const [produtosAcabandoDetalhes, setProdutosAcabandoDetalhes] = useState<PrevisaoItem[]>([]);
    const [produtoEdit, setProdutoEdit] = useState<Produto | null>(null);

    const tutorId = tutor?.id_tutor;

    const handleEditarProduto = (produto: Produto) => {
        setProdutoEdit(produto);
    }

    useEffect(() => {
        if (!tutorId) {
            setLoading(false);
            return;
        }

        async function fetchProdutos() {
            setLoading(true);

            try {
                const petsResponse = await axios.get(`http://localhost:5000/api/tutores/${tutorId}/tutores-e-pets`);
                const fetchedPets: Pet[] = petsResponse.data.pets || [];
                setPets(fetchedPets);

                const produtosTotais: Produto[] = [];

                await Promise.all(fetchedPets.map(async (pet) => {
                    const produtosResponse = await axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/produtos`).catch(() => ({ data: [] }));
                    if (Array.isArray(produtosResponse.data)) {
                        produtosResponse.data.forEach((produto: Produto) => {
                            produtosTotais.push({ ...produto, pet_nome: pet.nome_pet });
                        })
                    }
                }));

                setAllProdutos(produtosTotais);

                const previsaoComDetalhes = produtosTotais.map(calcularPrevisaoEStatus);
                const productNotifications: Notificacao[] = [];

                    previsaoComDetalhes.forEach(p => {
                        let title = '';
                        let subtitle = '';

                        if (p.dias_restantes <= 0) {
                            title = `Estoque esgotado: ${p.nome_produto}`;
                            subtitle = `O produto ${p.nome_produto} do pet ${p.pet_nome} está esgotado.`;
                        } else if (p.dias_restantes <= 3) {
                            title = `Estoque crítico: ${p.nome_produto}`;
                            subtitle = `O produto ${p.nome_produto} do pet ${p.pet_nome} está com estoque crítico (restam ${p.dias_restantes} dias).`;
                        } else if (p.dias_restantes <= 7) {
                            title = `Estoque baixo: ${p.nome_produto}`;
                            subtitle = `O produto ${p.nome_produto} do pet ${p.pet_nome} está com estoque baixo (restam ${p.previsao_termino} dias).`;
                        }

                        if (title) {
                            productNotifications.push({
                                id: `prod-alert-${p.id_compra}`,
                                tipo: 'produto', 
                                titulo: title, 
                                mensagem: subtitle,
                                data: new Date().toISOString(),
                                lida: false
                            });
                        }

                    })

                const produtosAcabando = previsaoComDetalhes.filter(p => p.dias_restantes < Infinity && p.dias_restantes <= 7)
                    .sort((a, b) => a.dias_restantes - b.dias_restantes);
                
                const racaoTotal = previsaoComDetalhes.filter(p => p.categoria.toLowerCase().includes('ração'))
                    .sort((a, b) => a.dias_restantes - b.dias_restantes);

                const medicamentosTotal = previsaoComDetalhes.filter(p => p.categoria.toLowerCase().includes('medicamento'))
                    .sort((a, b) => a.dias_restantes - b.dias_restantes);

                const previsoes = previsaoComDetalhes.filter(item => !isNaN(item.dias_restantes))
                    .sort((a, b) => a.dias_restantes - b.dias_restantes);

                setPrevisaoDeCompras(previsoes);

                setProdutosAcabandoDetalhes(produtosAcabando);
                setRacaoTotalComDetalhes(racaoTotal);
                setMedicamentosTotalComDetalhes(medicamentosTotal);

                if (setNotifications) {
                    setNotifications(prev => {
                        const existingProductNotifications = prev?.filter(n => n.tipo !== 'produto');
                        return [...(existingProductNotifications || []), ...productNotifications];
                    })
                }

            } catch (error) {
                console.error("Erro ao buscar dados de produtos: ", error);
            } finally {
                setLoading(false);
            }

        }

        fetchProdutos();

    }, [tutorId, refreshData, setNotifications]);

    const getStatusBadge = (item: PrevisaoItem) => {
        const dias = item.dias_restantes;

        if (item.categoria.toLowerCase().includes("ração") || item.categoria.toLowerCase().includes("alimento") || item.categoria.toLowerCase().includes("higiene")) {
            if (dias <= 3) return { text: "Crítico", variant: "danger" };
            if (dias <= 7) return { text: "Baixo", variant: "warning" };
            return {text: "OK", variant: "success"};
        }

        if (item.previsao_termino === 'Estoque suficiente' || item.dias_restantes === Infinity) {
            return { text: "Em estoque", variant: "success" };
        }

        if (item.previsao_termino === 'Esgotado' || dias <= 0) {
            return { text: "Esgotado", variant: "danger" };
        }

        const hoje = new Date().getTime();
        const previsao = new Date(item.previsao_termino).getTime();

        if (dias <= 3) return { text: "Crítico", variant: "danger" };
        if (dias <= 7) return { text: "Baixo", variant: "danger" };
        if (dias <= 14) return { text: "Atenção", variant: "warning" };

        return { text: "Ativo", variant: "success"};

    }

    const handleDataChanged = () => {
        setRefreshData(prev => prev + 1);
    }

    const produtosAcabando = allProdutos.map(calcularPrevisaoEStatus).filter(p => p.dias_restantes < Infinity && p.dias_restantes <= 7).sort((a, b) => a.dias_restantes - b.dias_restantes);
    const racaoTotal = allProdutos.filter(p => p.categoria.toLowerCase().includes('ração'));
    const medicamentosTotal = allProdutos.filter(p => p.categoria.toLowerCase().includes('medicamento'));

    const handleExcluirProduto = async (produto: Produto) => {
        if (window.confirm(`Tem certeza que deseja excluir o produto "${produto.nome_produto}"?`)) {
            try{
                const response = await axios.delete(`http://localhost:5000/api/pets/${produto.id_pet}/produtos/${produto.id_compra}`);

                if (response.status === 200) {
                    alert('Produto excluído com sucesso.');
                    handleDataChanged();
                }
            } catch (erro: any) {
                console.error("Erro ao excluir produto: ", erro);
                alert(erro.response?.data?.error || 'Erro ao excluir produto.')
            }
        }
    }

    const getPrevisaoBadge = (status: PrevisaoItem['status_prev'], diasRestantes: number) => {
        if (diasRestantes <= 7) {
            return <Badge variant='danger'>Urgente</Badge>;
        } 
        if (diasRestantes <= 14) {
            return <Badge variant='warning'>Baixo</Badge>;
        }
        if (diasRestantes <= 30) {
            return <Badge variant='outline'>Em Breve</Badge>;
        }
        return <Badge variant='success'>OK</Badge>
    };

    return (
        <div className='produtos-page'>
            <Navbar/>
            <main className='produtos-container'>
                <div className='produtos-header'>
                    <div>
                        <h2>Produtos</h2>
                        <p>Controle de ração, medicamentos e acessórios</p>
                    </div>
                    <Button variant='primary' onClick={() => setIsAdicionarProdutoModalOpen(true)}><Plus size={16}/>Adicionar Produto</Button>
                </div>

                {loading ? (
                    <p>Carregando dados...</p>
                ) : (
                    <>
                        <section className='summary-cards-produtos'>
                            <Card className='card summary-card card-produtos-acabando'>
                                <div className='card-header-flex'>
                                    <div className='card-icon'><Activity size={18}/></div>
                                    <h3>Produtos Acabando</h3>
                                </div>
                                <CardContent>
                                    {produtosAcabando.length > 0 ? (
                                            produtosAcabandoDetalhes.map(p => (
                                                <div  className='item-info' key={p.id_compra}>
                                                    <div>
                                                    <h4>{p.nome_produto}</h4>
                                                    <span>Restam {p.dias_restantes} dias</span>
                                                    </div>

                                                    {(() => {
                                                        const b = getStatusBadge(p);
                                                        return <Badge variant={b.variant}>{b.text}</Badge>
                                                    })()}
                                                                           
                                                </div>
                                            ))                                    
                                    ) : (
                                        <div className='item-info-placeholder'>
                                            <p>Nenhum produto acabando</p>
                                        </div>
                                        
                                    )}
                                </CardContent>
                            </Card>

                            <Card className='card summary-card card-racao'>
                                <div className='card-header-flex'>
                                    <div className='card-icon'><Heart size={18}/></div>
                                    <h3>Ração</h3>
                                </div>
                                <CardContent>
                                    {racaoTotal.length > 0 ? (
                                        racaoTotalComDetalhes.map(p => (
                                                <div className='item-info' key={p.id_compra}>
                                                    <div>
                                                      <h4>{p.nome_produto}</h4> 
                                                      <span>{p.quantidade}kg - Duração: {p.dias_restantes} dias</span> 
                                                    </div>
                                                    {(() => {
                                                        const b = getStatusBadge(p);
                                                        return <Badge variant={b.variant}>{b.text}</Badge>
                                                    })()}
                                                </div>
                                            )) 
                                        
                                         
                                    ) : (
                                        <div className='item-info-placeholder'>
                                            <p>Nenhuma ração cadastrada.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className='card summary-card card-medicamentos'>
                                <div className='card-header-flex'>
                                    <div className='card-icon'><Syringe size={18}/></div>
                                    <h3>Medicamentos</h3>
                                </div>
                                <CardContent>
                                    {medicamentosTotal.length > 0 ? (
                                        medicamentosTotalComDetalhes.map(p => (
                                                <div className='item-info' key={p.id_compra}>
                                                    <div>
                                                      <h4>{p.nome_produto}</h4>  
                                                      <span>Próximo: {p.previsao_termino}</span>
                                                    </div>
                                                    {(() => {
                                                        const b = getStatusBadge(p);
                                                        return <Badge variant={b.variant}>{b.text}</Badge>
                                                    })()}
                                                </div>
                                            ))                                      
                                    ) : (
                                        <div className='item-info-placeholder'>
                                            <p>Nenhum medicamento cadastrado.</p>
                                        </div>
                                        
                                    )}
                                    </CardContent>
                            </Card>

                        </section>

                        <section className='previsao-compras-section'>
                            <h2>Previsão de Compras</h2>
                            <div className='previsao-list-wrapper'>
                                {previsaoDeCompras.length > 0 ? (
                                    <div className='produtos-list-detalhada'>
                                        {previsaoDeCompras.map(item => (
                                        <Card key={item.id_compra} className={`produto-detail-item card-status-${item.status_prev}`}>
                                            <div className='produto-detail-header'>
                                                <div className='info-produto-principal'>
                                                    <h4>{item.nome_produto} - {item.pet_nome}</h4>
                                                    <Badge variant='default'>{primeiraLetraMaiuscula(item.categoria)}</Badge>
                                                </div>
                                                <div className='status-e-actions'>
                                                    {getPrevisaoBadge(item.status_prev, item.dias_restantes)}
                                                    <div className='produto-actions'>
                                                        <Button variant='link' className='action-btn' onClick={() => handleEditarProduto(item)}><Edit size={18}/></Button>
                                                        <Button variant='link' className='action-btn danger' onClick={() => handleExcluirProduto(item)}><Trash2 size={18}/></Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='produto-detail-body-previsao'>
                                                <p className='detalhe-info-item'><Calendar size={16}/>Previsão de término: <strong>{item.previsao_termino}</strong> (Restam {item.dias_restantes})</p>
                                                <p className='detalhe-info-item'><ShoppingBag size={16}/>Comprado em: <strong>{formatDate(item.data_compra ? String(item.data_compra) : null)}</strong> | {Number(item.quantidade)} {item.categoria.includes('ração') ? 'kg' : 'unidades'}</p>
                                                <p className='detalhe-info-item'><DollarSign size={16}/>Valor estimado: R$ {Number(item.preco_compra).toFixed(2).replace('.', ',')}</p>
                                                <p className='detalhe-info-item'><MapPin size={16}/>{item.loja}</p>
                                            </div>
                                        </Card> 
                                        ))}
                                    </div>
                                ) : (
                                    <p>Nenhuma previsão de compra calculada no momento (Verifique se cadastrou o consumo médio).</p>
                                )}
                            </div>
                            

                        </section>

                    </>
                )}

            </main>

                {produtoEdit && (
                    <EditarProdutoModal
                        isOpen={!!produtoEdit}
                        onClose={() => setProdutoEdit(null)}
                        onProdutoUpdated={() => {
                            setProdutoEdit(null);
                            handleDataChanged();
                        }}
                        pets={pets}
                        produto={produtoEdit}
                        />
                )}

                {tutorId && (
                    <AdicionarProdutoModal
                        isOpen = {isAdicionarProdutoModalOpen}
                        onClose = {() => setIsAdicionarProdutoModalOpen(false)}
                        onProdutoAdded = {handleDataChanged}
                        pets = {pets}
                        tutorId = {tutorId}
                        />
                )}

        </div>
    )

}