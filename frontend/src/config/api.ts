// Endereço base da API do PetCare.
// Em desenvolvimento usa o backend local; em produção o valor vem da
// variável de ambiente VITE_API_URL definida na hospedagem.
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');
