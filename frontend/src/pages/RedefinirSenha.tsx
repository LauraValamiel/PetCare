import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../components/button'
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import '../styles/RedefinirSenha.css'

export default function RedefinirSenha() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token')

    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [erro, setErro] = useState('');
    const [success, setSuccess] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false)
    const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)

    const visibilidadeSenha = () => {
        setMostrarSenha(!mostrarSenha);
    }

    const visibilidadeConfirmarSenha = () => {
        setMostrarConfirmarSenha(!mostrarConfirmarSenha);
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');
        setSuccess('');

        if (!token) {
            setErro('Token de redefinição não foi encontrado, tente novamente.');
            return;
        }

        if (senha !== confirmarSenha) {
            setErro('As senhas não coincidem.');
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/tutores/redefinir-senha', {
                token: token,
                nova_senha: senha
            });

            if (response.status === 200) {
                setSuccess('Senha redefinida com sucesso! Você será redirecionado para a tela de login novamente.');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (erro: any) {
            setErro(erro.response?.data?.error || 'Ocorreu um erro ao redefinir a senha, tente novamente mais tarde');
        }
    }

    return (
        <div className='redefinir-senha-container'>
            <div className='redefinir-senha-card'>
                <h2>Redefinir Senha</h2>
                <p>Digite sua nova senha abaixo.</p>

                {erro && <p className='mensagem-erro'>{erro}</p>}
                {success && <p className='mensagem-sucesso'>{success}</p>}

                <form onSubmit={handleSubmit}>
                    <div className='input-group'>
                        <Lock size={20} className='input-icon'/>
                        <input type={mostrarSenha ? "text" : "password"} placeholder='Nova Senha' value={senha} onChange={(event) => setSenha(event.target.value)} required />
                        <div onClick={visibilidadeSenha} className='password-icon'>
                            {mostrarSenha ? <Eye size={20}/> : <EyeOff size={20}/>}
                         </div>
                    </div>                                
                    <div className='input-group'>
                        <Lock size={20} className='input-icon'/>
                        <input type={mostrarSenha ? "text" : "password"} placeholder='Confirmar Nova Senha' value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} required />
                        <div onClick={visibilidadeConfirmarSenha} className='password-icon'>
                            {mostrarConfirmarSenha ? <Eye size={20}/> : <EyeOff size={20}/>}
                         </div>
                    </div>
                    <Button type='submit' variant='primary' className='submit-btn'>Redefinir senha <ArrowRight size={18}/></Button>
                </form>
            </div>
        </div>
    )

}