import React from 'react';
import { Badge } from './badge';
import { X, Heart, Edit } from 'lucide-react';
import { type DetalhesPets, primeiraLetraMaiuscula, formatDate } from '../pages/MeusPets';
import '../styles/VerPet.css';


interface VerPetModal {
    isOpen: boolean;
    onClose: () => void;
    pet: DetalhesPets;
}

const API_URL = 'http://localhost:5000/api/uploads';

export function VerPet({ isOpen, onClose, pet}: VerPetModal) {
    if (!isOpen) {
        return null;
    }

    const fotoUrl = pet.foto_perfil ? `${API_URL}/${pet.foto_perfil}` : null;


    return (
        <div className='form' onClick={onClose}>
            <div className='ver-pet-modal-content' onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className='ver-pet-close-btn'><X size={24}/></button>

                <div className='ver-pet-header'>
                    {fotoUrl ? (
                        <img src={fotoUrl} alt={pet.nome_pet} className='ver-pet-foto' />
                    ) : (
                        <div className='ver-pet-foto-placeholder'>
                            <Heart size={60}/>
                        </div>
                    )}
                </div>

                <div className='ver-pet-body'>
                    <div className='ver-pet-titulo'>
                        <h2>{primeiraLetraMaiuscula(pet.nome_pet)}</h2>
                        <Badge variant={
                            pet.statusVacina === 'Atrasada' ? 'danger' :
                            pet.statusVacina === 'Vencendo' ? 'warning' : 'success'
                        }>
                            {pet.statusVacina}
                        </Badge>
                    </div>
                    <p className='ver-pet-subtitulo'>{primeiraLetraMaiuscula(pet.especie)} • {primeiraLetraMaiuscula(pet.raca)}</p>

                    <div className='ver-pet-stats-grid'>
                        <div className='ver-pet-stat-item'>
                            <span className='stat-label'>Idade</span>
                            <span className='stat-value'>{pet.idade}</span>
                        </div>
                        <div className='ver-pet-stat-item'>
                            <span className='stat-label'>Data de Nascimento</span>
                            <span className='stat-value'>{formatDate(pet.data_nascimento)}</span>
                        </div>
                        <div className='ver-pet-stat-item'>
                            <span className='stat-label'>Peso</span>
                            <span className='stat-value'>{pet.peso}</span>
                        </div>
                        <div className='ver-pet-stat-item'>
                            <span className='stat-label'>Gênero</span>
                            <span className='stat-value'>{pet.genero}</span>
                        </div>
                        <div className='ver-pet-stat-item'>
                            <span className='stat-label'>Castrado</span>
                            <span className='stat-value'>{pet.castrado  ? 'Sim' : 'Não'}</span>
                        </div>
                    </div>

                    <div className='ver-pet-details-list'>
                        <h3>Próximas Atividades e Resumo</h3>
                        <ul>
                            <li>
                                <span>Última vacina:</span>
                                <span>{pet.ultimaVacina}</span>
                            </li>
                            <li>
                                <span>Próxima vacina:</span>
                                <span>{pet.proximaVacina}</span>
                            </li>
                            <li>
                                <span>Última consulta:</span>
                                <span>{pet.ultimaConsulta}</span>
                            </li>
                        </ul>

                    </div>

                </div>

            </div>

        </div>
    )

}
