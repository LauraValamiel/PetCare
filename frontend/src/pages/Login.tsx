import React, { useState, useEffect, useContext, use } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Heart, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '../components/button';
import StoreContext from '../components/store/Context';
import jade from '../assets/login/jade.jpg';
import maya from '../assets/login/maya.jpg';
import jademaya from '../assets/login/jademaya.jpg';
import jademayanatal from '../assets/login/jademayanatal.jpg';
import lola from '../assets/login/lola.jpg';
import mel from '../assets/login/mel.jpg';
import mia from '../assets/login/mia.jpg';
import amy from '../assets/login/amy.jpg';
import mimi from '../assets/login/mimi.jpg';
import bob from '../assets/login/bob.jpg';
import pitty from '../assets/login/pitty.jpg';
import meg from '../assets/login/meg.jpg';
import zeus from '../assets/login/zeus.jpg';
import '../styles/Login.css';
import Swal from 'sweetalert2';

const imagens = [ {image: jade}, {image:maya}, {image: jademaya}, {image: jademayanatal}, {image: lola}, {image: mel}, {image: mia}, {image: amy}, {image: mimi, posicao: 'center top'}, {image: bob}, {image: pitty}, {image: meg}, {image: zeus} ];

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
    const setNome = store?.setNome;
    const setCpf = store?.setCpf;
    const setFotoPerfilTutor = store?.setFotoPerfilTutor;
    const setTutor = store?.setTutor;

    const [loginEmail, setLoginEmail] = useState('');
    const [loginSenha, setLoginSenha] = useState('');
    const [cadNomeCompleto, setCadNomeCompleto] = useState('');
    const [cadEmail, setCadEmail] = useState('');
    const [cadSenha, setCadSenha] = useState('');
    const [cadConfirmarSenha, setCadConfirmarSenha] = useState('');

    const isLoginValid = loginEmail.trim() !== '' && loginSenha.trim() !== '';

    const isCadastroValid = 
        cadNomeCompleto.trim() !== '' && 
        cadEmail.trim() !== '' && 
        cadSenha.trim() !== '' && 
        cadConfirmarSenha.trim() !== '';

    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';

    useEffect(() => {
        const timer = setInterval(() => {
            setImagemAtual((prevImagemAtual) => (prevImagemAtual + 1) % imagens.length);
        }, 5000); 

        return () => clearInterval(timer); 
        
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

    useEffect(() => {
        setErro('');
        setNotification('');
        const form = document.querySelector('form');
        if (form) {
            form.reset();
        }
    }, [isLoginView]);


    const handleGoogleClick = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
            window.google.accounts.id.prompt((notification: any) => {
                if (notification.isNotDisplayed()) {
                    Swal.fire({
                        title: 'Erro',
                        text: 'O prompt de login do Google não pode ser exibido. Verifique se os bloqueadores de pop-up estão desativados e tente novamente.',
                        icon: 'error',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#b942f4'
                    });
                }
            });
        } else {
            Swal.fire({
                title: 'Erro',
                text: 'A biblioteca de login do Google não foi carregada corretamente. Tente novamente mais tarde.',
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#b942f4'
            });
        }
    };

    const handleGoogleCredentialResponse = async (response: any) => {
        const setTutor = store?.setTutor;
        const setFotoPerfilTutor = store?.setFotoPerfilTutor;
        try {
            const res = await axios.post('http://localhost:5000/api/auth/google', {
                id_token: response.credential,
            });

            if (res.status === 200) {
                localStorage.setItem('tutor', JSON.stringify(res.data));
                navigate('/home');
                if (setToken && setNome && setCpf && setFotoPerfilTutor) {
                    setToken(res.data);
                    setNome(res.data.nome_completo);
                    setCpf(res.data.cpf || '');
                    setFotoPerfilTutor(res.data.foto_perfil_tutor || null);

                    if (setTutor) setTutor(res.data);
                }
                navigate('/home');
            }
        } catch (erro: any){
            if (erro.response?.status === 404){
                Swal.fire({
                    title: 'Erro',
                    text: 'Parece que esta conta do Google ainda não está associada a um perfil no PetCare. Vamos criar uma nova conta para você!',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#b942f4'
                });

                setIsLoginView(false);
            }
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
        const setFotoPerfilTutor = store?.setFotoPerfilTutor;

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

                if (setToken && setNome && setCpf && setFotoPerfilTutor) {
                    setToken(user);
                    setNome(user.nome_completo);
                    setCpf(user.cpf || '');
                    setFotoPerfilTutor(user.foto_perfil_tutor || null);
                    if (setTutor) setTutor(user);
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
                setNotification('Cadastro realizado com sucesso!');
                try {
                    const loginResponse = await axios.post('http://localhost:5000/api/login', {
                        email: email.value,
                        senha: senha.value
                    });

                    if (loginResponse.status === 200) {
                        const user = loginResponse.data;

                        localStorage.removeItem('tutor');
                        sessionStorage.removeItem('tutor');

                        sessionStorage.setItem('tutor', JSON.stringify(user));

                        if (setToken && setNome && setCpf && setFotoPerfilTutor) {
                            setToken(user);
                            setNome(user.nome_completo);
                            setCpf(user.cpf || '');
                            setFotoPerfilTutor(user.foto_perfil_tutor || null);
                            if (setTutor) setTutor(user);
                        }

                        navigate('/home');
                    }
                } catch (erro: any) {
                    // Se houver alguma falha inesperada apenas no momento do login automático, 
                    // cai para a tela de login normal para o usuário tentar manualmente
                    setNotification('Cadastro realizado com sucesso! Por favor, faça login para continuar.');
                    setIsLoginView(true);
                }
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
        const email = await Swal.fire({
            title: 'Esqueci minha senha',
            text: 'Digite o email cadastrado para receber as instruções de redefinição de senha.',
            input: 'email',
            inputPlaceholder: 'Digite seu email',
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#b942f4',
        });
        if (!email) {
            return
        }
        if (email.dismiss === Swal.DismissReason.cancel) {
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/tutores/esqueci-senha', { email: email.value });
            Swal.fire({
                title: 'Sucesso',
                text: response.data.message || 'Se o email estiver cadastrado, um link de redefinição foi enviado.',
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#b942f4'
            });
        } catch (erro) {
            console.log("Erro:", erro)
            Swal.fire({
                title: 'Erro',
                text: 'Erro ao enviar solicitação. Tente novamente.',
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#b942f4'
            });
        }
    };
    

    return (
        <div className='login-container'>
            <div className='imagens-fundo'>
                {imagens.map((img, index) => (
                    <div key={index} className='slide-fotos' style={{ backgroundImage: `url(${img.image})`, opacity: index === imagemAtual ? 1 : 0, backgroundPosition: img.posicao || 'center center', backgroundSize: 'cover' }}></div>
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
                        <form key='login-form' onSubmit={login} className='form-login'>
                            <div className='input-group'>
                                <Mail size={20} className='input-icon'/>
                                <input 
                                    type="email" 
                                    name="email" 
                                    placeholder='Email'
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    required autoComplete='off'/>
                            </div>
                            <div className='input-group'>
                                <Lock size={20} className='input-icon'/>
                                <input 
                                    type={mostrarSenha ? "text" : "password"} 
                                    name="senha" 
                                    placeholder='Senha'
                                    value={loginSenha}
                                    onChange={(e) => setLoginSenha(e.target.value)} 
                                    required autoComplete='off'/>
                                <div onClick={visibilidadeSenha} className='password-icon'>
                                    {mostrarSenha ? <Eye size={20}/> : <EyeOff size={20}/>}
                                </div>
                                
                            </div>
                            <div className='form-options'>
                                <label><input type="checkbox" name='remember'/>Lembrar-me</label>
                                <a href="#" onClick={esqueceuSenha}>Esqueceu a senha?</a>
                            </div>
                            <Button type="submit" variant="primary" className={`submit-btn ${isLoginValid ? 'btn-active' : ''}`}> Entrar <ArrowRight size={16}/></Button>
                        </form>
                    ) : (
                        <form key='register-form' onSubmit={cadastro} className='form-login'>
                            <div className='input-group'>
                                <User size={20} className='input-icon'/>
                                <input 
                                    type="text" 
                                    name="nome_completo" 
                                    placeholder='Nome Completo'
                                    value={cadNomeCompleto}
                                    onChange={(e) => setCadNomeCompleto(e.target.value)} 
                                    required autoComplete="off"/>
                            </div>
                            <div className='input-group'>
                                <Mail size={20} className='input-icon'/>
                                <input 
                                    type="email"   
                                    name="email" 
                                    placeholder='Email'
                                    value={cadEmail}
                                    onChange={(e) => setCadEmail(e.target.value)} 
                                    required autoComplete='off'/>
                            </div>
                            <div className='input-group'>
                                <Lock size={20} className='input-icon'/>
                                <input 
                                    type={mostrarSenha ? "text" : "password"} 
                                    name="senha" 
                                    placeholder='Senha'
                                    value={cadSenha}
                                    onChange={(e) => setCadSenha(e.target.value)} 
                                    required autoComplete="off"/>
                                <div onClick={visibilidadeSenha} className='password-icon'>
                                    {mostrarSenha ? <Eye size={20}/> : <EyeOff size={20}/>}
                                </div>
                            </div>
                            <div className='input-group'>
                                <Lock size={20} className='input-icon'/>
                                <input 
                                    type={mostrarConfirmarSenha ? "text" : "password"} 
                                    name="confirmarSenha" 
                                    placeholder='Confirmar Senha'
                                    value={cadConfirmarSenha}
                                    onChange={(e) => setCadConfirmarSenha(e.target.value)} 
                                    required autoComplete='off'/>
                                <div onClick={visibilidadeConfirmarSenha} className='password-icon'>
                                    {mostrarConfirmarSenha ? <Eye size={20}/> : <EyeOff size={20}/>}
                                </div>
                            </div>
                            <Button type='submit' variant='primary' className={`submit-btn ${isCadastroValid ? 'btn-active' : ''}`}>Criar Conta <ArrowRight size={16}/></Button>
                            <p className='texto-privacidade'>Ao criar uma conta, você concorda com os nossos <a href="#">Termos de Uso</a> e <a href="#">Política de Privacidade</a></p>
                        </form>
                    )}

                    <div className='social-login'>
                        <div className='divisor'>ou continue com</div>
                        <div id="google-button-manual" className='social-buttons'>
                        </div>
                        {isLoginView && (
                            <p style={{ fontSize: '13px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
                                * Primeiro acesso? Vá para a aba <strong>Cadastro</strong> para criar sua conta com o Google.
                            </p>
                        )}
                    </div>

                </div>
                </div>
                

            </div>

        </div>
    )

}