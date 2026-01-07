/*import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import StoreContext, { type Notificacao} from './Context.tsx';
import type { Tutor } from '../../pages/MeusPets.tsx';
import useStorage from '../utils/useStorage';
import axios from 'axios';

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
                .catch(() => ({ pet_nome: pet.nome_pet, data: [] })) // Se falhar, retorna lista vazia
        );

      const promisesConsultas = pets.map((pet: any) => 
            axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/consultas`)
                .then(res => ({ pet_nome: pet.nome_pet, data: res.data }))
                .catch(() => ({ pet_nome: pet.nome_pet, data: [] }))
      );

      const promisesProdutos = pets.map((pet: any) => 
            axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/produtos`)
                .then(res => ({ pet_nome: pet.nome_pet, data: res.data }))
                .catch(() => ({ pet_nome: pet.nome_pet, data: [] }))
        );

      /*const promisesAlertas = pets.map((pet: any) => 
            axios.get(`http://localhost:5000/api/pets/${pet.id_pet}/alertas`)
                .then(res => ({ pet_nome: pet.nome_pet, data: res.data }))
                .catch(() => ({ pet_nome: pet.nome_pet, data: [] }))
      );*/


      /*const [resultadosVacinas, resultadosConsultas, resultadosProdutos] = await Promise.all([
          Promise.all(promisesVacinas),
          Promise.all(promisesConsultas),
          Promise.all(promisesProdutos)
      ]);

      const listaNotificacoes: Notificacao[] = [];
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zera horas para comparação apenas de datas

      const seteDiasDepois = new Date();
      seteDiasDepois.setDate(hoje.getDate() + 7);

      const tresDiasDepois = new Date();
      tresDiasDepois.setDate(hoje.getDate() + 3);

      resultadosVacinas.forEach((resultado: any) => {
        if (Array.isArray(resultado.data)) {
          resultado.data.forEach((vacina: any) => {
            const dataRef = vacina.data_proxima_dose || vacina.data_vencimento;

            if (dataRef) {
              const dataVacina = new Date(dataRef);
              const dataVacinaComp = new Date(dataVacina);
              dataVacinaComp.setHours(0, 0, 0, 0);

              if (dataVacinaComp <= seteDiasDepois && !vacina.status_prev) {
                listaNotificacoes.push({
                  id: `vac-prov-${vacina.id_vacina}`,
                  titulo: `Vacina Pendente`,
                  mensagem: `A próxima dose da vacina ${vacina.nome_vacina} do pet ${vacina.nome_pet} está agendada para ${vacina.data_proxima_dose}.`,
                  tipo: 'vacina',
                  data: vacina.data_proxima_dose,
                  lida: false
                });
              }
            }
        });
      }
    });

    resultadosConsultas.forEach((resultado: any) => {
        if (Array.isArray(resultado.data)) {
            resultado.data.forEach((consulta: any) => {
              const dataRef = consulta.data_consulta || consulta.data_hora;

              if (dataRef) {
                const dataConsulta = new Date(dataRef);
                const dataConsultaComp = new Date(dataConsulta);
                dataConsultaComp.setHours(0,0,0,0);

                // Consultas geralmente avisamos se são futuras e próximas
                if (dataConsultaComp >= hoje && dataConsultaComp <= tresDiasDepois && consulta.status !== 'concluido') {
                  listaNotificacoes.push({
                    id: `cons-prov-${consulta.id_consulta}`,
                    titulo: 'Consulta Próxima',
                    mensagem: `Consulta para ${resultado.pet_nome} dia ${dataConsulta.toLocaleDateString()}.`,
                    tipo: 'consulta',
                    data: dataRef,
                    lida: false
                  });
                }
              }
            });
          }
      });

      resultadosProdutos.forEach(res => {
            if (Array.isArray(res.data)) {
                res.data.forEach((p: any) => {
                    // Lógica de cálculo simplificada para notificação
                    const qtd = Number(p.quantidade) || 0;
                    const consumo = Number(p.consumo_medio) || 0;
                    
                    if (consumo > 0 && qtd > 0) {
                        // Converte consumo para diário se necessário
                        let consumoDiario = consumo;
                        if (p.consumo_periodo === 'semana') consumoDiario = consumo / 7;
                        else if (p.consumo_periodo === 'mes') consumoDiario = consumo / 30.4;
                        else if (p.consumo_periodo === 'ano') consumoDiario = consumo / 365;

                        const diasRestantes = qtd / consumoDiario;

                        // Se acabar em 5 dias ou menos
                        if (diasRestantes <= 5) {
                            listaNotificacoes.push({
                                id: `prod-${p.id_compra}`,
                                titulo: diasRestantes < 1 ? 'Produto Esgotado' : 'Produto Acabando',
                                mensagem: `O produto ${p.nome_produto} (${res.pet_nome}) vai acabar em aprox. ${Math.ceil(diasRestantes)} dias.`,
                                tipo: 'produto',
                                data: new Date().toISOString(), // Data de hoje como referência
                                lida: false
                            });
                        }
                    }
                });
            }
        });

      /*resultadosAlertas.forEach((resultado: any) => {
          if (Array.isArray(resultado.data)) {
              resultado.data.forEach((alerta: any) => {
                if (alerta.data_alerta) {
                    const dataAlerta = new Date(alerta.data_alerta);
                    if (dataAlerta <= seteDiasDepois && !alerta.lida) {
                        listaNotificacoes.push({
                            id: `alert-prov-${alerta.id_alerta}`,
                            titulo: 'Alerta',
                            mensagem: `Alerta para ${resultado.pet_nome}: ${alerta.descricao_alerta || alerta.titulo}.`,
                            tipo: 'alerta',
                            data: alerta.data_alerta,
                            lida: false
                        });
                    }
                }
              });
          }
      });*/

      /*listaNotificacoes.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      setNotificacoes(listaNotificacoes);

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
        notificacoes,
        setNotificacoes,
        carregarNotificacoes,
        isNotificationsOpen,
        setIsNotificationsOpen, 
        isProfileOpen,
        setIsProfileOpen,
        fotoPerfilTutor,
        setFotoPerfilTutor
     }}
    >
      {children}
    </StoreContext.Provider>
  )
}


export default StoreProvider;*/


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

  const carregarNotificacoes = useCallback(async () => {
    if (!token || !tutor?.id_tutor) return;

    try {
      // 1. Busca Tutor e Pets
      const responsePets = await axios.get(`http://localhost:5000/api/tutores/${tutor.id_tutor}/tutores-e-pets`);
      const pets = responsePets.data.pets || responsePets.data;

      if (!Array.isArray(pets) || pets.length === 0) {
        setNotificacoes([]);
        return;
      }

      // 2. Prepara Promises (Vacinas, Consultas, Produtos e AGORA COMPROMISSOS)
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

      // ADICIONADO: Busca Compromissos (onde costumam ficar os exames)
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

      // 3. Executa TODAS as buscas
      const [resVacinas, resConsultas, resCompromissos, resProdutos] = await Promise.all([
          Promise.all(promisesVacinas),
          Promise.all(promisesConsultas),
          Promise.all(promisesCompromissos),
          Promise.all(promisesProdutos)
      ]);

      // 4. Processamento Unificado
      const listaAccumulada: Notificacao[] = [];
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const seteDiasDepois = new Date(hoje);
      seteDiasDepois.setDate(hoje.getDate() + 7);

      const tresDiasDepois = new Date(hoje);
      tresDiasDepois.setDate(hoje.getDate() + 3);

      // --- VACINAS ---
      resVacinas.forEach((r: any) => {
        if (Array.isArray(r.data)) {
          r.data.forEach((v: any) => {
            const dataRef = v.proxima_dose || v.data_proxima_dose;
            if (dataRef) {
              const dataVac = new Date(dataRef);
              const dataComp = new Date(dataVac);
              dataComp.setHours(0,0,0,0);

              if (dataComp <= seteDiasDepois && !v.status_concluido) {
                listaAccumulada.push({
                  id: `vac-${v.id_vacina}`,
                  titulo: dataComp < hoje ? 'Vacina Atrasada' : 'Vacina Pendente',
                  mensagem: `A vacina ${v.nome_vacina} (${r.pet_nome}) vence dia ${dataVac.toLocaleDateString()}.`,
                  tipo: 'vacina',
                  data: dataRef,
                  lida: false
                });
              }
            }
          });
        }
      });

      // --- CONSULTAS ---
      resConsultas.forEach((r: any) => {
        if (Array.isArray(r.data)) {
            r.data.forEach((c: any) => {
              const dataRef = c.data_consulta || c.data_hora;
              if (dataRef) {
                const dataCons = new Date(dataRef);
                const dataComp = new Date(dataCons);
                dataComp.setHours(0,0,0,0);

                if (dataComp >= hoje && dataComp <= tresDiasDepois && c.status !== 'concluido') {
                  listaAccumulada.push({
                    id: `cons-${c.id_consulta}`,
                    titulo: 'Consulta Próxima',
                    mensagem: `Consulta para ${r.pet_nome} dia ${dataCons.toLocaleDateString()} às ${c.horario || '??:??'}.`,
                    tipo: 'consulta',
                    data: dataRef,
                    lida: false
                  });
                }
              }
            });
          }
      });

      // --- COMPROMISSOS (EXAMES E OUTROS) - NOVO BLOCO ---
      resCompromissos.forEach((r: any) => {
        if (Array.isArray(r.data)) {
            r.data.forEach((c: any) => {
              // Verifica se tem data
              const dataRef = c.data_compromisso || c.data_hora;
              
              if (dataRef) {
                const dataCompromisso = new Date(dataRef);
                const dataComp = new Date(dataCompromisso);
                dataComp.setHours(0,0,0,0);

                // Lógica: Maior que hoje e menor que 3 dias (aviso próximo)
                if (dataComp >= hoje && dataComp <= tresDiasDepois) {
                  // Tenta identificar se é um exame pelo título
                  const isExame = c.titulo?.toLowerCase().includes('exame');
                  const tipoTitulo = isExame ? 'Exame Próximo' : 'Compromisso Próximo';

                  listaAccumulada.push({
                    id: `comp-${c.id_compromisso}`,
                    titulo: tipoTitulo,
                    mensagem: `${c.titulo} para ${r.pet_nome} dia ${dataCompromisso.toLocaleDateString()} às ${c.hora || '??:??'}.`,
                    tipo: 'consulta', // Usa o ícone de calendário
                    data: dataRef,
                    lida: false
                  });
                }
              }
            });
          }
      });

      // --- PRODUTOS ---
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

      // 5. Ordenação e Atualização Final
      listaAccumulada.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      
      // Remove duplicatas (caso o backend retorne o mesmo item em rotas diferentes)
      const listaUnica = Array.from(new Map(listaAccumulada.map(item => [item.id, item])).values());

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
        token, setToken,
        tutor, setTutor,
        cpf, setCpf,
        nome, setNome,
        fotoPerfilTutor, setFotoPerfilTutor,
        notificacoes, setNotificacoes, carregarNotificacoes,
        isNotificationsOpen, setIsNotificationsOpen, 
        isProfileOpen, setIsProfileOpen
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export default StoreProvider;