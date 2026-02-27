import React, { useState } from "react";
import axios from 'axios';
import { Button } from "./button";
import { Lock, X } from "lucide-react";
import '../styles/AdicionarPet.css';

interface AlterarSenhaModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorId: number | undefined;
}

export function AlterarSenhaModal({ isOpen, onClose, tutorId}: AlterarSenhaModalProps) {
    const [formData, setFormData] = useState({
        senha_atual: '',
        nova_senha: '',
        confirmar_senha: ''
    });

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setErro('');
        setSucesso('');

        if (!tutorId) {
            const stored = localStorage.getItem('tutor') || sessionStorage.getItem('tutor');
            let parsedId: number | undefined;

            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    parsedId = parsed?.id_tutor;
                } catch { /* empty */ }
            }

            if (!parsedId) {
                setErro("Erro interno: ID do usuário não identificado. Faça login novamente.");
                return;
            } else {
                tutorId = parsedId;
            }

        }

        if (formData.nova_senha !== formData.confirmar_senha) {
            setErro("A nova senha e a cconfimação não coincidem.");
            return;
        }

        try {
            await axios.put(`http://localhost:5000/api/tutores/${tutorId}/alterar-senha`, {
                senha_atual: formData.senha_atual,
                nova_senha: formData.nova_senha
            });

            setSucesso("Senha alterada com sucesso!");
            setTimeout(() => {
                onClose();
                setFormData({ senha_atual: '', nova_senha: '', confirmar_senha: '' });
                setSucesso('');
            }, 2000);
        } catch (error: any) {
            setErro(error.response?.data?.error || "Erro ao alterar senha.");
            setLoading(false);
        }

    };

    return (
        <div className="form" onClick={onClose}>
            <div className="form-content" onClick={e => e.stopPropagation()} style={{maxWidth: '400px'}}>
                <div className="form-header">
                    <h3><Lock size={20}/>Alterar Senha</h3>
                    <button onClick={onClose} className="form-close-btn"><X size={22}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-body">
                        {erro && <p className="form-erro">{erro}</p>}
                        {sucesso && <p className="form-sucesso" style={{color: 'green', textAlign: 'center', background: '#e8f5e9', padding: '10px', borderRadius: '8px'}}>{sucesso}</p>}

                        <div className="form-group">
                            <label>Senha Atual</label>
                            <input type="password" name="senha_atual" value={formData.senha_atual} onChange={handleChange} required autoComplete="off"/>
                        </div>
                        <div className="form-group">
                            <label>Nova Senha</label>
                            <input type="password" name="nova_senha" value={formData.nova_senha} onChange={handleChange} required autoComplete="off"/>
                        </div>
                        <div className="form-group">
                            <label>Confirmar Nova Senha</label>
                            <input type="password" name="confirmar_senha" value={formData.confirmar_senha} onChange={handleChange} required autoComplete="off" />
                        </div>
                        <div className="form-footer">
                            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
                            <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
                        </div>

                    </div>
                </form>

            </div>

        </div>
    )

}