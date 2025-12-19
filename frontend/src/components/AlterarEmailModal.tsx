import React, {useState} from "react";
import axios from "axios";
import { Button } from "./button";
import { Mail, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdicionarPet.css';

interface AlterarEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorId: number | undefined;
    emailAtual: string | undefined;
}

export function AlterarEmailModal({ isOpen, onClose, tutorId, emailAtual }: AlterarEmailModalProps) {
    const [formData, setFormData] = useState({
        novo_email: '',
        senha_atual: ''
    });

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');

        try {
            await axios.put(`http://localhost:5000/api/tutores/${tutorId}/alterar-email`, {
                novo_email: formData.novo_email,
                senha_atual: formData.senha_atual
            });
            setSucesso("Email atualizado! Faça login novamente. Redirecionando para login...");
            setTimeout(() => {
                onClose();
                navigate('/login');
            }, 2000);
        } catch (error: any) {
            setErro(error.response?.data?.error || "Erro ao alterar email.");
        }
    };

    return (
        <div className="form" onClick={onClose}>
            <div className="form-content" onClick={e => e.stopPropagation()} style={{maxWidth: '400px'}}>
                <div className="form-header">
                    <h3><Mail size={20}/>Alterar Email</h3>
                    <button onClick={onClose} className="form-close-btn"><X size={22}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-body">
                        {erro && <p className="form-erro">{erro}</p>}
                        {sucesso && <p style={{color: 'green', textAlign: 'center', background: '#e8f5e9', padding: '10px', borderRadius: '8px'}}>{sucesso}</p>}

                        <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '10px'}}>Email atual: <strong>{emailAtual}</strong></p>

                    
                        <div className="form-group">
                            <label>Novo Email</label>
                            <input type="email" name="novo_email" value={formData.novo_email} onChange={handleChange} required />
                        </div>
                        <div className='form-group'>
                                <label>Confirme sua Senha</label>
                                <input type="password" name="senha_atual" value={formData.senha_atual} onChange={handleChange} required placeholder="Para sua segurança"/>
                        </div>
                    </div>
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit'>Salvar</Button>
                    </div>
                    
                </form>

            </div>

        </div>
    )

}