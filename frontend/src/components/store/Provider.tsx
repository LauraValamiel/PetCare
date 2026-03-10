import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import StoreContext, { type Notificacao } from './Context';
import useStorage from '../utils/useStorage';

interface StoreProviderProps {
  children: ReactNode;
}

const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [token, setToken] = useStorage("token", null);
  const [tutor, setTutor] = useStorage("tutor", null);
  const [cpf, setCpf] = useStorage("cpf", null);
  const [nome, setNome] = useStorage("nome", null);
  const [fotoPerfilTutor, setFotoPerfilTutor] = useStorage("foto_perfil_tutor", null);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  const limparNotificacoes = () => {
    const idsParaIgnorar = notificacoes.map(n => n.id);
    const salvosAnteriormente = localStorage.getItem('notificacoes_dispensadas');
    const listaSalva = salvosAnteriormente ? JSON.parse(salvosAnteriormente) : [];
    const novaListaIgnorados = [...new Set([...listaSalva, ...idsParaIgnorar])];
    localStorage.setItem('notificacoes_dispensadas', JSON.stringify(novaListaIgnorados));
    setNotificacoes([]);
  };

  const carregarNotificacoes = useCallback(async () => {
    if (!token || !tutor?.id_tutor) return;

    try {
      
      const responsePets = await axios.get(`http://localhost:5000/api/tutores/${tutor.id_tutor}/tutores-e-pets`);
      const pets = responsePets.data.pets || responsePets.data;

      if (!Array.isArray(pets) || pets.length === 0) {
        setNotificacoes([]);
        return;
      }

      const promisesVacinas = pets.map((pet: any) => 
            axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/vacinas`)
                .then(res => ({ pet_nome: pet.nome_pet, data: res.data }))
                .catch(() => ({ pet_nome: pet.nome_pet, data: [] }))
      );

      const promisesConsultas = pets.map((pet: any) => 
            axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/consultas`)
                .then(res => ({ pet_nome: pet.nome_pet, data: res.data }))
                .catch(() => ({ pet_nome: pet.nome_pet, data: [] }))
      );

      const promisesCompromissos = pets.map((pet: any) => 
            axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/compromissos`)
                .then(res => ({ pet_nome: pet.nome_pet, data: res.data }))
                .catch(() => ({ pet_nome: pet.nome_pet, data: [] }))
      );

      const promisesProdutos = pets.map((pet: any) => 
            axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/produtos`)
                .then(res => ({ pet_nome: pet.nome_pet, data: res.data }))
                .catch(() => ({ pet_nome: pet.nome_pet, data: [] }))
      );

      const [resVacinas, resConsultas, resCompromissos, resProdutos] = await Promise.all([
          Promise.all(promisesVacinas),
          Promise.all(promisesConsultas),
          Promise.all(promisesCompromissos),
          Promise.all(promisesProdutos)
      ]);

      const listaAccumulada: Notificacao[] = [];
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const seteDiasDepois = new Date(hoje);
      seteDiasDepois.setDate(hoje.getDate() + 7);

      const tresDiasDepois = new Date(hoje);
      tresDiasDepois.setDate(hoje.getDate() + 3);

      resVacinas.forEach((r: any) => {
        if (Array.isArray(r.data)) {
          r.data.forEach((v: any) => {
            const dataRef = v.proxima_dose || v.data_proxima_dose;
            if (dataRef) {
              const dataVac = new Date(dataRef.replace(/-/g, '/'));
              const dataComp = new Date(dataVac);
              dataComp.setHours(0,0,0,0);

              if (dataComp <= seteDiasDepois && !v.status_concluido) {
                listaAccumulada.push({
                  id: `vac-${v.id_vacina}`,
                  titulo: dataComp < hoje ? 'Vacina Atrasada' : 'Vacina Pendente',
                  mensagem: `A vacina ${v.nome_vacina} (${r.pet_nome}) vence dia ${dataVac.toLocaleDateString('pt-BR')}.`,
                  tipo: 'vacina',
                  data: dataRef.replace(/-/g, '/'),
                  lida: false
                });
              }
            }
          });
        }
      });

      resConsultas.forEach((r: any) => {
        if (Array.isArray(r.data)) {
            r.data.forEach((c: any) => {
              const dataRef = c.data_consulta || c.data_hora;
              if (dataRef) {
                const dataCons = new Date(dataRef.replace(/-/g, '/'));
                const dataComp = new Date(dataCons);
                dataComp.setHours(0,0,0,0);

                if (dataComp >= hoje && dataComp <= tresDiasDepois && c.status !== 'concluido') {
                  const horaFormatada = (c.hora || c.horario || '??:??').slice(0, 5);

                  listaAccumulada.push({
                    id: `cons-${c.id_consulta}`,
                    titulo: 'Consulta Próxima',
                    mensagem: `Consulta para ${r.pet_nome} dia ${dataCons.toLocaleDateString('pt-BR')} às ${horaFormatada}.`,
                    tipo: 'consulta',
                    data: dataRef.replace(/-/g, '/'),
                    lida: false
                  });
                }
              }
            });
          }
      });

      resCompromissos.forEach((r: any) => {
        if (Array.isArray(r.data)) {
            r.data.forEach((c: any) => {
              const dataRef = c.data_compromisso || c.data_hora;
              
              if (dataRef) {
                const dataCompromisso = new Date(dataRef.replace(/-/g, '/'));
                const dataComp = new Date(dataCompromisso);
                dataComp.setHours(0,0,0,0);

                if (dataComp >= hoje && dataComp <= tresDiasDepois) {
                  const isExame = c.titulo?.toLowerCase().includes('exame');
                  const tipoTitulo = isExame ? 'Exame Próximo' : 'Compromisso Próximo';
                  const horaFormatada = (c.hora || c.horario || '??:??').slice(0, 5);

                  listaAccumulada.push({
                    id: `comp-${c.id_compromisso}`,
                    titulo: tipoTitulo,
                    mensagem: `${c.titulo} para ${r.pet_nome} dia ${dataCompromisso.toLocaleDateString('pt-BR')} às ${horaFormatada}.`,
                    tipo: 'consulta', 
                    data: dataRef.replace(/-/g, '/'),
                    lida: false
                  });
                }
              }
            });
          }
      });

      resProdutos.forEach((r: any) => {
            if (Array.isArray(r.data)) {
                r.data.forEach((p: any) => {
                    const qtd = Number(p.quantidade) || 0;
                    const consumo = Number(p.consumo_medio) || 0;
                    
                    if (consumo > 0 && qtd > 0) {
                        let consumoDiario = consumo;
                        if (p.consumo_periodo === 'semana') consumoDiario = consumo / 7;
                        else if (p.consumo_periodo === 'mes') consumoDiario = consumo / 30.4;
                        else if (p.consumo_periodo === 'ano') consumoDiario = consumo / 365;

                        const diasRestantes = qtd / consumoDiario;

                        if (diasRestantes <= 5) {
                            listaAccumulada.push({
                                id: `prod-${p.id_compra}`,
                                titulo: diasRestantes < 1 ? 'Produto Esgotado' : 'Produto Acabando',
                                mensagem: `O produto ${p.nome_produto} (${r.pet_nome}) acaba em aprox. ${Math.ceil(diasRestantes)} dias.`,
                                tipo: 'produto',
                                data: new Date().toISOString(),
                                lida: false
                            });
                        }
                    }
                });
            }
        });

      const ignoradosSalvos = localStorage.getItem('notificacoes_dispensadas');
      const listaIgnorados = ignoradosSalvos ? JSON.parse(ignoradosSalvos) : [];

      const listaFiltrada = listaAccumulada.filter(item => !listaIgnorados.includes(item.id));

      listaFiltrada.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      const listaUnica = Array.from(new Map(listaFiltrada.map(item => [item.id, item])).values());

      setNotificacoes(listaUnica);

    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    }
  }, [token, tutor]);

  useEffect(() => {
    carregarNotificacoes();
  }, [carregarNotificacoes]);

  return (
    <StoreContext.Provider
      value={{
        token, 
        setToken,
        tutor, 
        setTutor,
        cpf, 
        setCpf,
        nome, 
        setNome,
        fotoPerfilTutor, 
        setFotoPerfilTutor,
        notificacoes, 
        setNotificacoes, 
        carregarNotificacoes, 
        limparNotificacoes,
        isNotificationsOpen, 
        setIsNotificationsOpen, 
        isProfileOpen, 
        setIsProfileOpen
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export default StoreProvider;