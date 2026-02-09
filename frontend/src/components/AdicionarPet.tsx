import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Heart, UploadCloud, X } from 'lucide-react';
import '../styles/AdicionarPet.css';

interface AdicionarPetModal {
    isOpen: boolean;
    onClose: () => void;
    onPetAdded: () => void;
    tutorId: number;
}

const calcularIdade = (dataNascimento: string): number => {
    if (!dataNascimento) {
        return 0;
    }

    try {
        const dataNasc = new Date(dataNascimento);
        const today = new Date();
        let ano = today.getFullYear() - dataNasc.getFullYear();
        const mes = today.getMonth() - dataNasc.getMonth();

        if (mes < 0 || (mes === 0 && today.getDate() < dataNasc.getDate())) {
            ano --;
        }

        return ano;
    } catch (erro) {
        return 0;
    }
};

export function AdicionarPet({isOpen, onClose, onPetAdded, tutorId} : AdicionarPetModal) {
    const [erro, setErro] = useState('');
    const [formData, setFormData] = useState({
        nome_pet: '',
        especie: '',
        raca: '',
        genero: '',
        data_nascimento: '',
        peso: '',
        castrado: '',

    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                nome_pet: '', 
                especie: '', 
                raca: '', 
                genero: '', 
                data_nascimento: '', 
                peso: '', 
                castrado: '',
            });
            setSelectedFile(null);
            setImagePreview(null);
            setErro('');
        }
    }, [isOpen])

    if (!isOpen) {
        return null;
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0){
            const file = event.target.files[0];
            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            setSelectedFile(null);
            setImagePreview(null);
        }
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');

        if (!formData.nome_pet || !formData.especie || !formData.raca || !formData.genero || !formData.data_nascimento || !formData.peso || formData.castrado === '') {
            setErro('Por favor, preencha todos os campos obrogatórios (*).');
            return;
        }

        const idadeCalculada = calcularIdade(formData.data_nascimento);

        const formDataApi = new FormData();

        formDataApi.append('nome_pet', formData.nome_pet);
        formDataApi.append('especie', formData.especie);
        formDataApi.append('raca', formData.raca);
        formDataApi.append('genero', formData.genero);
        formDataApi.append('data_nascimento', formData.data_nascimento);
        formDataApi.append('peso', (parseFloat(formData.peso.replace(',', '.')) || 0).toString());
        formDataApi.append('idade', idadeCalculada.toString());
        formDataApi.append('castrado', String(formData.castrado === 'sim'));

        if (selectedFile) {
            formDataApi.append('foto_perfil', selectedFile, selectedFile.name);
        } 

        try {
            const response = await axios.post(`http://localhost:5000/api/tutores/${tutorId}/pets/novo-pet`, formDataApi, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }); //ver

            if (response.status === 201) {
                onPetAdded();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao adicionar pet:", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar pet. Tente novamente.');
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><Heart size={20}/> Adicionar Novo Pet</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className='form-foto-perfil'>
                        <label htmlFor="foto_perfil" className='foto-perfil-label'>
                            {imagePreview ? (
                                <img src={imagePreview} alt='Preview' className='foto-perfil-preview'/>
                            ) : (
                                <div className='foto-perfil-placeholder'>
                                    <UploadCloud size={18}/>
                                    <span>Adicionar foto</span>
                                </div>
                            )}
                            </label>                            
                            <input type="file" id='foto_perfil' onChange={handleFileChange} accept='image/png, image/jpeg, image/jpg' style={{display: 'none'}} />

                    </div>

                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}

                        <div className='form-grid'>
                            <div className='form-group'>
                                <label htmlFor="nome_pet">Nome *</label>
                                <input type="text" id='nome_pet' name='nome_pet' placeholder='Ex: Luna' value={formData.nome_pet} onChange={handleChange} autoComplete="off"/>
                            </div>
                            <div className='form-group'>
                                <label htmlFor="especie">Tipo *</label>
                                <select name="especie" id="especie" value={formData.especie} onChange={handleChange}>
                                    <option value="">Selecione</option>
                                    <option value="Cachorro">Cachorro</option>
                                    <option value="Gato">Gato</option>
                                    <option value="Pássaro">Pássaro</option>
                                    <option value="Roedor">Roedor</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>

                            <div className='form-group'>
                                <label htmlFor="raca">Raça *</label>
                                <input type="text" id='raca' name='raca' placeholder='Ex: Shih-tzu' value={formData.raca} onChange={handleChange} autoComplete="off" />
                            </div>
                            <div className='form-group'>
                                <label htmlFor="genero">Genero *</label>
                                <select name="genero" id="genero" value={formData.genero} onChange={handleChange}>
                                    <option value="">Selecione</option>
                                    <option value="Fêmea">Fêmea</option>
                                    <option value="Macho">Macho</option>
                                </select>
                            </div>

                            <div className='form-group'>
                                <label htmlFor="data_nascimento">Data de Nascimento *</label>
                                <input type="date" id='data_nascimento' name='data_nascimento' placeholder='dd/mm/aaaa' value={formData.data_nascimento} onChange={handleChange} autoComplete="off" />
                            </div>

                            <div className='form-group'>
                                <label htmlFor="castrado">Castrado *</label>
                                <select name="castrado" id="castrado" value={formData.castrado} onChange={handleChange}>
                                    <option value="">Selecione</option>
                                    <option value="sim">Sim</option>
                                    <option value="nao">Não</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="peso">Peso *</label>
                                <input type="text" id="peso" name="peso" placeholder="Ex: 4.2 kg" value={formData.peso} onChange={handleChange} autoComplete="off" />
                            </div>
                        </div>
                    </div>

                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit'>Adicionar Pet</Button>

                    </div>

                </form>

            </div>

        </div>
    )

}

