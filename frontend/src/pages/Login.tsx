import React, { useState, useEffect, useContext, use } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '../components/button';
import StoreContext from '../components/store/Context';

import DamaVagabundo from '../assets/login/DamaVagabundo.jpg';
import cachorroFofo from '../assets/login/cachorro-fofo.jpg';
import jade from '../assets/login/jade.jpg';
import maya from '../assets/login/maya.jpg';
import jademaya from '../assets/login/jademaya.jpg';
import '../styles/Login.css';

const imagens = [ DamaVagabundo, cachorroFofo, jade, maya, jademaya];

declare global {
    interface Window { google: any; }
}

export default function Login() {

    const [isLoginView, setIsLoginView] = useState(true);
    const [imagemAtual, setImagemAtual] = useState(0);
    const [erro, setErro] = useState('');
    const [notification, setNotification] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false)
    const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
    const navigate = useNavigate();
    const store = useContext(StoreContext);
    const setToken = store?.setToken;

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';

    useEffect(() => {
        const timer = setInterval(() => {
            setImagemAtual((prevImagemAtual) => (prevImagemAtual + 1) % imagens.length);
        }, 5000); // Muda a imagem a cada 5 segundos

        return () => clearInterval(timer); // Limpa o timer ao desmontar o componente
        
    }, []);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        script.onload = () => {
            if (window.google && GOOGLE_CLIENT_ID) {
                window.google.accounts.id.initialize({
                  client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredentialResponse,
                })

                const googleDiv = document.getElementById("google-button-manual");
                if (googleDiv) {
                    window.google.accounts.id.renderButton(googleDiv, {
                        theme: "outline",
                        size: "large",
                        width: "100%",
                        text: "continue_width",
                        logo_alignment: "left",
                        locale: "pt-BR",
                    });
                }
                
            }
        }

        return () => {
            document.body.removeChild(script)
        };
    }, []);


    const handleGoogleClick = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
            window.google.accounts.id.prompt((notification: any) => {
                if (notification.isNotDisplayed()) {
                    alert('Não foi possível abrir o seletor do Google. Tente novamente.')
                }
            });
        } else {
            alert('Google Identity Service não foi carregado ainda.')
        }
    }

    const handleGoogleCredentialResponse = async (response: any) => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/google', {
                id_token: response.credential,
            });

            if (res.status === 200) {
                localStorage.setItem('tutor', JSON.stringify(res.data));
                navigate('/home');
            }
        } catch (erro: any){
            console.error("Erro no login com o google", erro);
            setErro('Erro no login com o Google, tente novamente.')
        }
    }

    const visibilidadeSenha = () => {
        setMostrarSenha(!mostrarSenha);
    }

    const visibilidadeConfirmarSenha = () => {
        setMostrarConfirmarSenha(!mostrarConfirmarSenha);
    }


    const login = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');
        const formData = new FormData(event.currentTarget);
        const email = formData.get('email') as string;
        const senha = formData.get('senha') as string;
        const remember = formData.get('remember') === 'on';

        try {

            const response = await axios.post('http://localhost:5000/api/login', {
                email: email,
                senha: senha
            });

            if (response.status === 200) {
                const user = response.data;

                localStorage.removeItem('tutor');
                sessionStorage.removeItem('tutor');

                if(remember) {
                    localStorage.setItem('tutor', JSON.stringify(user));
                } else {
                    sessionStorage.setItem('tutor', JSON.stringify(user))
                }

                if (setToken) {
                    setToken(user);
                }

                navigate('/home');
            }
        } catch (erro: any) {
            if (erro.response && erro.response.data && erro.response.data.error) {
                setErro(erro.response.data.error);
            } else {
                setErro('Erro ao conectar ao tentar fazer login. Tente novamente mais tarde.');
            }
        }

    };

    const cadastro = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');
        const { nome_completo, email, senha, confirmarSenha } = event.currentTarget;

        if (senha.value !== confirmarSenha.value) {
            setErro('As senhas não coincidem.');
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/novo-tutor', {
                nome_completo: nome_completo.value,
                email: email.value,
                senha: senha.value
            });

            if (response.status === 201) {
                setNotification('Cadastro realizado com sucesso! Faça login para continuar.');
                setIsLoginView(true);
            }
        } catch (erro: any) {
            if (erro.response && erro.response.data && erro.response.data.error) {
                setErro(erro.response.data.error);
            } else {
                setErro('Erro ao conectar ao tentar fazer cadastro. Tente novamente mais tarde.');
            }
        }

    };

    const esqueceuSenha = async (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const email = prompt("Digite o email cadastrado para redefinir sua senha: ");
        if (!email) {
            return
        }

        try {
            const response = await axios.post('http://localhost:5000/api/tutores/esqueci-senha', { email });
            alert(response.data.message || 'Se o email estiver cadastrado, um link de redefinição foi enviado.');
        } catch (erro) {
            console.log("Erro:", erro)
            alert('Erro ao enviar solicitação.Tente novamente.')
        }
    };
    

    return (
        <div className='login-container'>
            <div className='imagens-fundo'>
                {imagens.map((img, index) => (
                    <div key={index} className='slide-fotos' style={{ backgroundImage: `url(${img})`, opacity: index === imagemAtual ? 1 : 0 }}></div>
                ))}
            </div>
            <div className='login-content'>
                <div className='login-info'>
                    <div className='login-section'>
                        <Heart size={40}/>
                        <h1>PetCare</h1>
                    </div>
                    <h2>Cuidando do seu melhor amigo</h2>
                    <p>Gerencie a saúde dos seus pets com facilidade. Controle vacinas, consultas, medicamentos e muito mais em um único lugar.</p>
                    <ul>
                        <li><Heart size={18}/><div className='text'><span>Cartão de Vacinas Digital</span><small>Tenha todo o histórico vacinal dos seus pets sempre à mão</small></div></li>
                        <li><Heart size={18}/><div className='text'><span>Alertas Inteligentes</span><small>Receba notificações sobre vacinas, consultas e produtos acabando</small></div></li>
                        <li><Heart size={18}/><div className='text'><span>Histórico Completo</span><small>Acompanhe consultas, exames e o desenvolvimento dos seus pets</small></div></li>
                    </ul>
                </div>

                <div className='form-section'>
                    <div className='login-form-container'>
                    <div className='form-tabs'>
                        <button onClick={() => setIsLoginView(true)} className={isLoginView ? 'active': ''}>Login</button>
                        <button onClick={() => setIsLoginView(false)} className={!isLoginView ? 'active': ''}>Cadastro</button>
                    </div>

                    {erro && <p className='mensagem-erro'>{erro}</p>}
                    {notification && <p className='mensagem-notificacao'>{notification}</p>}

                    {isLoginView ? (
                        <form onSubmit={login} className='form-login'>
                            <div className='input-group'>
                                <Mail size={20} className='input-icon'/>
                                <input type="email" name="email" placeholder='Email' required />
                            </div>
                            <div className='input-group'>
                                <Lock size={20} className='input-icon'/>
                                <input type={mostrarSenha ? "text" : "password"} name="senha" placeholder='Senha' required />
                                <div onClick={visibilidadeSenha} className='password-icon'>
                                    {mostrarSenha ? <Eye size={20}/> : <EyeOff size={20}/>}
                                </div>
                                
                            </div>
                            <div className='form-options'>
                                <label><input type="checkbox" name='remember'/>Lembrar-me</label>
                                <a href="#" onClick={esqueceuSenha}>Esqueceu a senha?</a>
                            </div>
                            <Button type="submit" variant="primary" className='submit-btn'> Entrar <ArrowRight size={18}/></Button>
                        </form>
                    ) : (
                        <form onSubmit={cadastro} className='form-login'>
                            <div className='input-group'>
                                <User size={20} className='input-icon'/>
                                <input type="text" name="nome_completo" placeholder='Nome Completo' required />
                            </div>
                            <div className='input-group'>
                                <Mail size={20} className='input-icon'/>
                                <input type="email" name="email" placeholder='Email' required />
                            </div>
                            <div className='input-group'>
                                <Lock size={20} className='input-icon'/>
                                <input type={mostrarSenha ? "text" : "password"} name="senha" placeholder='Senha' required />
                                <div onClick={visibilidadeSenha} className='password-icon'>
                                    {mostrarSenha ? <Eye size={20}/> : <EyeOff size={20}/>}
                                </div>
                            </div>
                            <div className='input-group'>
                                <Lock size={20} className='input-icon'/>
                                <input type={mostrarSenha ? "text" : "password"} name="confirmarSenha" placeholder='Confirmar Senha' required />
                                <div onClick={visibilidadeConfirmarSenha} className='password-icon'>
                                    {mostrarConfirmarSenha ? <Eye size={20}/> : <EyeOff size={20}/>}
                                </div>
                            </div>
                            <Button type='submit' variant='primary' className='submit-btn'>Criar Conta <ArrowRight size={18}/></Button>
                            <p className='texto-privacidade'>Ao criar uma conta, você concorda com os nossos <a href="#">Termos de Uso</a> e <a href="#">Política de Privacidade</a></p>
                        </form>
                    )}

                    <div className='social-login'>
                        <div className='divisor'>ou continue com</div>
                        <div id="google-button-manual" className='social-buttons'>
                        </div>
                    </div>

                </div>
                </div>
                

            </div>

        </div>
    )

}