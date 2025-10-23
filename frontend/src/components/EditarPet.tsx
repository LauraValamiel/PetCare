import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './button';
import { Heart, UploadCloud, X } from 'lucide-react';
import { AdicionarPet } from './AdicionarPet';
import type { DetalhesPets } from '../pages/MeusPets';

interface EditarPetModal {
    isOpen: boolean;
    onClose: () => void;
    onPetAtualizado: () => void;
    pet: DetalhesPets;
    tutorId: number;
}

const formatarDataParaInput = (data: string | null) => {
    if (!data){
        return '';
    }

    try {
        const dateObj = new Date(data);

        return dateObj.toISOString().split('T')[0];
    } catch (erro) {
        try {
            return new Date(data).toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    }
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

export function EditarPet({ isOpen, onClose, onPetAtualizado, pet, tutorId }: EditarPetModal) {
    const [erro, setErro] = useState('');
    const [formData, setFormData] = useState ({
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
            if (isOpen && pet) {
                setFormData({
                    nome_pet: pet.nome_pet || '', 
                    especie: pet.especie || '', 
                    raca: pet.raca || '', 
                    genero: pet.genero || '', 
                    data_nascimento: formatarDataParaInput(pet.data_nascimento), 
                    peso: pet.peso?.toString() || '', 
                    castrado: pet.castrado ? 'sim' : 'nao',
                });
                if (pet.foto_perfil) {
                    setImagePreview(`http://localhost:5000/api/uploads/${pet.foto_perfil}`);
                } else {
                    setImagePreview(null);
                }
                setSelectedFile(null);
                setErro('');
            }
        }, [isOpen, pet])
    
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
            } 
        }

        const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErro('');

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
        formDataApi.append('foto_perfil_original', pet.foto_perfil || '');

        if (selectedFile) {
            formDataApi.append('foto_perfil_nova', selectedFile, selectedFile.name);
        } 

        try {
            const response = await axios.put(`http://localhost:5000/api/tutores/${tutorId}/pets/${pet.id_pet}/atualizar-pet`, formDataApi, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }); //ver

            if (response.status === 200) {
                onPetAtualizado();
                onClose();
            }
        } catch (erro: any) {
            console.error("Erro ao atualizar pet:", erro);
            setErro(erro.response?.data?.error || 'Erro ao salvar pet. Tente novamente.');
        }
    };

    return (
        <div className='form' onClick={onClose}>
            <div className='form-content' onClick={(event) => event.stopPropagation()}>
                <div className='form-header'>
                    <h3><Heart size={20}/> Editar Pet</h3>
                    <button onClick={onClose} className='form-close-btn'><X size={22}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    {/* Preview da foto (igual ao AdicionarPet) */}
                    <div className='form-foto-perfil'>
                        <label htmlFor="foto-perfil" className='foto-perfil-label'>
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className='foto-perfil-preview' />
                            ) : (
                                <div className='foto-perfil-placeholder'>
                                    <UploadCloud size={24} />
                                    <span>Trocar Foto</span>
                                </div>
                            )}
                        </label>
                        <input type="file" id='foto-perfil' onChange={handleFileChange} accept='image/png, image/jpeg, image/jpg' style={{display: 'none'}} />
                    </div>

                    <div className='form-body'>
                        {erro && <p className='form-error'>{erro}</p>}
                        <div className='form-grid'>
                            <div className='form-group'>
                                <label htmlFor="nome_pet">Nome *</label>
                                <input type="text" id='nome_pet' name='nome_pet' placeholder='Ex: Luna' value={formData.nome_pet} onChange={handleChange}/>
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
                                <input type="text" id='raca' name='raca' placeholder='Ex: Shih-tzu' value={formData.raca} onChange={handleChange} />
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
                                <input type="date" id='data_nascimento' name='data_nascimento' placeholder='dd/mm/aaaa' value={formData.data_nascimento} onChange={handleChange} />
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
                                <input type="text" id="peso" name="peso" placeholder="Ex: 4.2 kg" value={formData.peso} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                    <div className='form-footer'>
                        <Button variant='outline' type='button' onClick={onClose}>Cancelar</Button>
                        <Button variant='primary' type='submit'>Salvar Alterações</Button>
                    </div>
                </form>
            </div>
        </div>
    );


}
