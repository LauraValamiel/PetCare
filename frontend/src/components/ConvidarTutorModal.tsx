import React, { useState } from 'react';
import axios from 'axios';
import { X, Mail, CheckCircle } from 'lucide-react';
import { Button } from './button';
import '../styles/AdicionarPet.css';

interface ConvidarTutorModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorId: number | undefined;
    pets: any[];
}

export function ConvidarTutorModal({ isOpen, onClose, tutorId, pets }: ConvidarTutorModalProps) {
    const [emailConvidado, setEmailConvidado] = useState('');
    const [petSelecionado, setPetSelecionado] = useState<string>('');
    const [status, setStatus] = useState<{type: 'erro' | 'sucesso', msg: string } | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        if (!petSelecionado) {
            setStatus({ type: 'erro', msg: 'Selecione um pet para compartilhar.'});
            return;
        }

        setLoading(true);

        try {
            await axios.post(`http://localhost:5000/api/tutores/${tutorId}/pets/${petSelecionado}/convidar-tutor`, {
                email: emailConvidado
            });

            setStatus({ type: 'sucesso', msg: 'Convite enviado com sucesso!' });
            setEmailConvidado('');

            setTimeout(() => {
                setStatus(null);
                onClose();
            }, 2000);
        } catch (error: any) {
            console.error(error);
            setStatus({
                type: 'erro',
                msg: error.response?.data?.error || 'Erro ao enviar convite.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className='form-header'>
                    <h3><Mail size={20}/>Convidar Tutor</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {status && (
                            <p style={{padding: '10px', borderRadius: '6px', textAlign: 'center', background: status.type === 'erro' ? '#ffebee' : '#e8f5e9', color: status.type === 'erro' ? '#c62828' : '#2e7d32', marginBottom: '15px' }}>
                                {status.type === 'sucesso' && <CheckCircle size={16} style={{marginRight: 5, verticalAlign: 'middle'}}/>}
                                {status.msg}
                            </p>
                        )}

                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px'}}>
                            Compartilhe o acesso aos cuidados do seu pet com outro familiar ou cuidador.
                        </p>

                        <div className='form-group'>
                            <label>Qual Pet compartilhar?</label>
                            <select value={petSelecionado} onChange={(e) => setPetSelecionado(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
                                <option value="">Selecione um pet:</option>
                                {pets.map((pet) => (
                                    <option key={pet.id_pet} value={pet.id_pet}>
                                        {pet.nome_pet}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className='form-group'>
                            <label>Email do convidado</label>
                            <input type="email" value={emailConvidado} onChange={(e) => setEmailConvidado(e.target.value)} placeholder='exemplo@email.com' required />
                        </div>
                    </div>

                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit' disabled={loading}>{loading ? 'Enviando...' : 'Enviar Convite'}</Button>
                    </div>
                </form>

            </div>

        </div>
    );

}