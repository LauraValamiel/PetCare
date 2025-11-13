import React, { useMemo } from 'react';
import { X, Syringe, Stethoscope, FileText, Edit, Calendar } from 'lucide-react';
import { Button } from './button';
import { type VacinaDetalhada } from '../pages/CartaoVacina';
import { formatDate } from '../pages/MeusPets';
import '../styles/HistoricoCompleto.css';

interface Compromisso {
    id_compromisso: number;
    titulo: string;
    data_compromisso: string;
    pet_nome: string;
}

interface Consulta {
    id_consulta: number;
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
    setVacinaEdit: (vacina: VacinaDetalhada) => void;
}

type HistoricoItem = {
    id: string;
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
    setVacinaEdit
} : HistoricoCompletoModalProps) {

    const historicoUnificado = useMemo(() => {
        const listaUnificada: HistoricoItem[] = [];

        vacinas.forEach(vacina => {
            if (vacina.data_vacinacao){
                listaUnificada.push({
                    id: `v-${vacina.id_vacina}`,
                    tipo: 'vacina',
                    data: new Date(vacina.data_vacinacao),
                    titulo: vacina.nome_vacina,
                    petNome: vacina.nome_pet || 'Pet',
                    dataOriginal: vacina,
                });
            }
        });

        consultas.forEach(consulta => {
            const isExame = consulta.motivo.toLowerCase().includes('exames');
            listaUnificada.push({
                id: `c-${consulta.id_consulta}`,
                tipo: isExame ? 'exame' : 'consulta',
                data: new Date(consulta.data_consulta),
                titulo: consulta.motivo,
                petNome: consulta.pet_nome || 'Pet',
                dataOriginal: consulta,
            });
        });

        compromissos.forEach(compromisso => {
            const isExame = compromisso.titulo.toLowerCase().includes('exame');
            if (new Date(compromisso.data_compromisso) < new Date()) {
                listaUnificada.push({
                    id: `comp-${compromisso.id_compromisso}`,
                    tipo: isExame ? 'exame' : 'compromisso',
                    data: new Date(compromisso.data_compromisso),
                    titulo: compromisso.titulo,
                    petNome: compromisso.pet_nome || 'Pet',
                    dataOriginal: compromisso,
                });
            }
        });

        return listaUnificada
            .filter(item => !isNaN(item.data.getTime()))
            .sort((a, b) => b.data.getTime() - a.data.getTime());

    }, [consultas, compromissos, vacinas]);

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
                                        <span className='historico-item-data'>{formatDate(item.data.toISOString())}</span>
                                        <span className='historico-item-titulo'>{item.titulo}</span>
                                        <span className='historico-item-pet'>{item.petNome}</span>
                                    </div>
                                    <div className='historico-item-actions'>
                                        {item.tipo === 'vacina' && (
                                            <Button 
                                                variant='link'
                                                className='edit-hist-btn'
                                                onClick={() => setVacinaEdit(item.dataOriginal as VacinaDetalhada)}
                                                >
                                                    <Edit size={16}/>
                                            </Button>
                                        )}
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