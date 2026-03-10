import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { X, Stethoscope, User } from 'lucide-react';
import '../styles/AdicionarPet.css';

interface Clinica {
    id_clinica: number;
    nome_clinica: string;
    endereco: string;
    telefone: string;
}

interface EditarClinicaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClinicaUpdated: () => void;
    clinica: Clinica | null;
}

const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits; 
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export function EditarClinicaModal({ isOpen, onClose, onClinicaUpdated, clinica}: EditarClinicaModalProps) {
    const [formData, setFormData] = useState<Omit<Clinica, 'id_clinica'> | any> ({});
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    const [veterinarios, setVeterinarios] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && clinica) {
            setFormData({
                nome_clinica: clinica.nome_clinica,
                endereco: clinica.endereco,
                telefone: clinica.telefone ? maskPhone(clinica.telefone) : '',
            });
            setErro('');
            setLoading(false);

            axios.get(`http://localhost:5000/api/clinica/${clinica.id_clinica}/veterinarios`)
                .then(res => setVeterinarios(res.data))
                .catch(err => console.error("Erro ao buscar veterinários", err));

        }
    }, [isOpen, clinica]);

    if (!isOpen || !clinica) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData((prev: any) => ({...prev, [name]: value}))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (loading) return;
        setErro('');

        if (!formData.nome_clinica || !formData.endereco || !formData.telefone) {
            setErro('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        setLoading(true);

        try {

            const dadosParaEnviar = {
                ...formData,
                telefone: formData.telefone.replace(/\D/g, '')
            };

            const response = await axios.put(`http://localhost:5000/api/clinica/${clinica.id_clinica}`, dadosParaEnviar);

            if (response.status === 200) {
                onClinicaUpdated();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao editar clínica: ", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar alterações. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><Stethoscope size={20}/>Editar Clínica</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>  

                <form onSubmit={handleSubmit}>
                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-grid'>
                            <div className='form-group full-width'>
                                <label htmlFor="nome_clinica">Nome da Clínica *</label>
                                <input type="text" id='nome_clinica' name='nome_clinica' value={formData.nome_clinica || ""} onChange={handleChange} />
                            </div>
                            <div className='form-group full-width'>
                                <label htmlFor="endereco">Endereço *</label>
                                <input type="text" name="endereco" id="endereco" value={formData.endereco || ''} onChange={handleChange} />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="telefone">Telefone *</label>
                                <input type="text" id='telefone' name='telefone' value={formData.telefone || ''} onChange={(e) => setFormData({...formData, telefone: maskPhone(e.target.value)})} maxLength={15} autoComplete="off" />
                            </div>
                            <div className='form-group full-width' style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                                <label style={{ marginBottom: '8px', display: 'block', color: '#555' }}>Veterinários Vinculados</label>
                                {veterinarios.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {veterinarios.map(vet => (
                                            <li key={vet.id_veterinario} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.9rem', color: '#333' }}>
                                                <User size={14} color="#b942f4"/> 
                                                <strong>{vet.nome}</strong> 
                                                {vet.especialidade && <span style={{ color: '#888' }}>- {vet.especialidade}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>Nenhum veterinário cadastrado nesta clínica.</p>
                                )}
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