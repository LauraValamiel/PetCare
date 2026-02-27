import React, { useMemo } from 'react';
import { X, Syringe, Stethoscope, FileText, Edit, Calendar, Trash2 } from 'lucide-react';
import { Button } from './button';
import { type VacinaDetalhada } from '../pages/CartaoVacina';
import { formatDate, type Pet } from '../pages/MeusPets';
import '../styles/HistoricoCompleto.css';
import axios from 'axios';
import Swal from 'sweetalert2';

interface Compromisso {
    id_compromisso: number;
    id_pet: number;
    titulo: string;
    data_compromisso: string;
    pet_nome: string;
}

interface Consulta {
    id_consulta: number;
    id_pet: number;
    motivo: string;
    data_consulta: string;
    pet_nome?: string;
}

interface HistoricoCompletoModalProps {
    isOpen: boolean;
    onClose: () => void;
    consultas: Consulta[];
    compromissos: Compromisso[];
    vacinas: VacinaDetalhada[];
    pets: Pet[];
    onDataChanged: () => void;
    setVacinaEdit: (vacina: VacinaDetalhada) => void;
    setConsultaEdit: (consulta: Consulta) => void;
    setCompromissoEdit: (compromisso: Compromisso) => void;
}

type HistoricoItem = {
    id: string;
    id_pet?: number;
    tipo: 'vacina' | 'consulta' | 'compromisso' | 'exame';
    data: Date;
    titulo: string;
    petNome: string;
    dataOriginal: VacinaDetalhada | Consulta | Compromisso;
};

export function HistoricoCompletoModal ({
    isOpen,
    onClose,
    consultas,
    compromissos,
    vacinas,
    pets,
    setVacinaEdit,
    setConsultaEdit,
    setCompromissoEdit,
    onDataChanged
} : HistoricoCompletoModalProps) {

    const historicoUnificado = useMemo(() => {
        const listaUnificada: HistoricoItem[] = [];

        vacinas.forEach(vacina => {
            if (vacina.data_vacinacao){
                listaUnificada.push({
                    id: `v-${vacina.id_vacina}`,
                    id_pet: vacina.id_pet,
                    tipo: 'vacina',
                    data: new Date(vacina.data_vacinacao.split('T')[0] + 'T00:00:00Z'),
                    titulo: vacina.nome_vacina,
                    petNome: vacina.nome_pet || 'Pet',
                    dataOriginal: vacina,
                });
            }
        });

        consultas.forEach(consulta => {
            const isExame = consulta.motivo.toLowerCase().includes('exame');
            const petId = consulta.id_pet;
            const nomePet = pets.find(p => p.id_pet === petId)?.nome_pet || 'Pet';

            listaUnificada.push({
                id: `c-${consulta.id_consulta}`,
                id_pet: petId,
                tipo: isExame ? 'exame' : 'consulta',
                data: new Date(consulta.data_consulta.split('T')[0] + 'T00:00:00Z'),
                titulo: consulta.motivo,
                petNome: nomePet,
                dataOriginal: consulta,
            });
        });

        compromissos.forEach(compromisso => {
            const isExame = compromisso.titulo.toLowerCase().includes('exame');
            const dataCompromissoStr = compromisso.data_compromisso.split('T')[0];
            const petId = compromisso.id_pet;
            const nomePet = pets.find(p => p.id_pet === petId)?.nome_pet || 'Pet';

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            if (new Date(dataCompromissoStr + 'T00:00:00Z') < new Date()) { 
                listaUnificada.push({
                    id: `comp-${compromisso.id_compromisso}`,
                    id_pet: petId,
                    tipo: isExame ? 'exame' : 'compromisso',
                    data: new Date(dataCompromissoStr + 'T00:00:00Z'), 
                    titulo: compromisso.titulo,
                    petNome: nomePet,
                    dataOriginal: compromisso,
                });
            }
        });

        return listaUnificada
            .filter(item => !isNaN(item.data.getTime()))
            .sort((a, b) => b.data.getTime() - a.data.getTime());

    }, [consultas, compromissos, vacinas, pets]);

    if (!isOpen) {
        return null;
    }

    const getIcon = (tipo: HistoricoItem['tipo']) => {
        switch (tipo) {
            case 'vacina':
                return <Syringe size={18} className='icon-vacina'/>;
            case 'consulta':
                return <Stethoscope size={18} className='icon-consulta'/>;
            case 'exame':
                return <FileText size={18} className='icon-exame'/>;
            case 'compromisso':
                return <Calendar size={18} className='icon-compromisso'/>;
            default:
                return null;
        }
    };

    const handleDelete = async (item: HistoricoItem) => {
        
        const result = await Swal.fire({
            title: 'Confirmação',
            text: `Tem certeza que deseja excluir: ${item.titulo}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#b942f4',
            cancelButtonColor: '#6c757d'
        });

        if (!result.isConfirmed) return;
        
        const [prefixo, idReal] = item.id.split('-');
        
        try {
            let url = '';
            if (prefixo === 'v') {
                url = `http://localhost:5000/api/pets/${item.id_pet}/deletar-vacina/${idReal}`;
            } else if (prefixo === 'comp') { 
                url = `http://localhost:5000/api/pets/${item.id_pet}/compromissos/${idReal}`;
            } else if (prefixo === 'c') {
                url = `http://localhost:5000/api/pets/${item.id_pet}/deletar-consulta/${idReal}`;
            }

            await axios.delete(url);
            Swal.fire({
                title: 'Sucesso!',
                text: 'Item excluído com sucesso!',
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#b942f4'
            });
            onDataChanged();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            Swal.fire({
                title: 'Erro',
                text: 'Não foi possível excluir o item. Tente novamente.',
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#b942f4'
            });

        }
    };

    if (!isOpen) return null;

    return (
        <div className='form' onClick={onClose}>
            <div className='historico-modal-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><FileText size={20}/>Histórico Completo</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>

                <div className='historico-modal-body'>
                    {historicoUnificado.length === 0 ? (
                        <p>Nenhum histórico encontrado.</p>
                    ): (
                        <ul className='historico-list'> 
                            {historicoUnificado.map((item) => (
                                <li key={item.id} className={`historico-item item-tipo-${item.tipo}`}>
                                    <div className='historico-item-icon'>
                                        {getIcon(item.tipo)}
                                    </div>
                                    <div className='historico-item-details'>
                                        <span className='item-info-data'>
                                            {item.data && !isNaN(item.data.getTime()) ? formatDate(item.data.toISOString()) : '--/--/----'}
                                        </span>
                                        <span className='historico-item-titulo'>{item.titulo}</span>
                                        <span className='historico-item-pet'>{item.petNome}</span>
                                    </div>
                                    <div className='historico-item-actions'>
                                        <Button 
                                            variant='link'
                                            className='edit-hist-btn'
                                            onClick={() => {
                                                if (item.tipo === 'vacina') setVacinaEdit(item.dataOriginal as VacinaDetalhada);
                                                else if (item.tipo === 'compromisso') setCompromissoEdit(item.dataOriginal as Compromisso);
                                                else setConsultaEdit(item.dataOriginal as Consulta);
                                            }}
                                        >
                                            <Edit size={16}/>
                                        </Button>
                                        <Button 
                                            variant='link'
                                            className='delete-hist-btn'
                                            onClick={() => handleDelete(item)}
                                        >
                                            <Trash2 size={16}/>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                </div>
                <div className='form-footer'>
                    <Button variant='outline' type='button' onClick={onClose}>Fechar</Button>
                </div>

            </div>

        </div>

    )


}