<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=260&color=0:ff4fa3,50:ff6bb5,100:ff85c2&text=PetCare&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=40&desc=Sistema%20de%20Gest%C3%A3o%20de%20Sa%C3%BAde%20Animal&descAlignY=65&descSize=20"/>
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Baloo+2&weight=700&size=28&pause=1200&color=FF4FA3&center=true&vCenter=true&width=800&lines=Gest%C3%A3o+completa+da+sa%C3%BAde+do+seu+pet;Vacinas+%E2%80%A2+Consultas+%E2%80%A2+Hist%C3%B3rico+M%C3%A9dico;Tudo+em+um+s%C3%B3+lugar+para+o+seu+melhor+amigo+%F0%9F%90%BE" alt="Typing SVG" />
</p>
<p align="center">

<img src="https://img.shields.io/badge/TCC-Aprovado%20com%209.5-success?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge&logo=react"/>
<img src="https://img.shields.io/badge/Backend-Flask-blue?style=for-the-badge&logo=flask"/>
<img src="https://img.shields.io/badge/Linguagem-Python-blue?style=for-the-badge&logo=python"/>
<img src="https://img.shields.io/badge/Container-Docker-blue?style=for-the-badge&logo=docker"/>

</p>

# 🐶 Sobre o Projeto

O **PetCare** é uma **plataforma web para gestão da saúde e rotina de animais de estimação**, desenvolvida para centralizar todas as informações importantes dos pets em um único sistema.

A aplicação permite que tutores registrem:

- histórico médico
- vacinas
- consultas veterinárias
- produtos utilizados
- clínicas
- perfis de tutores

Tudo de forma **organizada, segura e acessível**.

---

## 🎓 Contexto Acadêmico

Este projeto foi desenvolvido como **Trabalho de Conclusão de Curso (TCC)** e recebeu a nota **9.5**, demonstrando qualidade técnica, organização arquitetural e aplicabilidade prática.

O sistema foi pensado para resolver um problema real:  
a **desorganização das informações médicas dos animais de estimação**.

---

# ✨ Funcionalidades

### 🐾 Gestão de Pets
- Cadastro completo de animais
- Perfil detalhado de cada pet
- Informações médicas centralizadas

### 💉 Cartão de Vacinação
- Registro de vacinas
- Histórico vacinal completo
- Controle de imunização

### 🩺 Histórico Médico
- Consultas
- Exames
- Diagnósticos

### 🏥 Clínicas Veterinárias
- Registro de clínicas
- Organização de atendimentos

### 🛒 Produtos
- Registro de medicamentos
- Produtos utilizados no cuidado do pet

### 👥 Gestão de Tutores
- Perfil de usuários
- Compartilhamento de cuidados entre tutores

---

# 🧱 Arquitetura do Sistema

O projeto segue uma arquitetura **Full Stack moderna**, separando claramente **Frontend e Backend**.


- Frontend (React + Vite)
- REST API
- Backend (Flask)
- Banco de Dados (PostgreeSQL)


Essa separação garante:

- maior escalabilidade
- manutenção simplificada
- desacoplamento entre interface e lógica

---

# 🛠️ Tecnologias Utilizadas

## 💻 Frontend

- **React**
- **Vite**
- **TypeScript**
- **React Router DOM**
- **Lucide React (ícones)**
- **SweetAlert2**
- **CSS Responsivo**

---

## ⚙️ Backend

- **Python**
- **Flask**
- **Flask SQLAlchemy**
- **Flask JWT Extended**

Principais responsabilidades:

- API REST
- autenticação
- gerenciamento de dados
- regras de negócio

---

## 🐳 Infraestrutura

- **Docker**
- **Docker Compose**

Permite subir todo o ambiente com apenas um comando.

---

# 🚀 Como Executar o Projeto

## Pré-requisitos

Instalar:

- Node.js
- Python
- Docker (opcional)

---

# 🐋 Execução com Docker (Recomendado)

Na raiz do projeto execute:

```bash
docker-compose up --build
```
Após iniciar:
```bash
http://localhost:5173
```
---
# ⚙️ Execução Manual
Backend
```bash
cd backend
```
#### Criar ambiente virtual:
```bash
python -m venv venv
```
#### 1. Ativar:

Windows
```bash
venv\Scripts\activate
```
Linux / Mac
```bash
source venv/bin/activate
```
#### 2. Instalar dependências:
```bash
pip install -r requirements.txt
```
#### 3. Executar API:
```bash
python run.py
```
## Frontend
```bash
cd frontend
```
#### Instalar dependências:
```bash
npm install
```
### Executar projeto:
```bash
npm run dev
```
A aplicação ficará disponível em:
```bash
http://localhost:5173
```

# 📂 Estrutura do Projeto
```bash
PetCare
│
├── backend
│   ├── models
│   ├── routes
│   ├── services
│   └── run.py
│
├── frontend
│   ├── components
│   ├── pages
│   ├── services
│   └── assets
│
├── docker-compose.yml
└── README.md
```
# 🐈 Uma mensagem para os tutores...
Muito obrigado por explorar o PetCare. Que o seu amiguinho de quatro patas (ou penas, ou escamas) tenha sempre uma vida cheia de amor, petiscos e muita saúde! 🦴🧸

<p align="center">
<img src="https://raw.githubusercontent.com/LauraValamiel/PetCare/main/frontend/src/assets/login/pets.gif" width="200"/>
</p>

<p align="center">
<i>Desenvolvido com carinho e muita dedicação.</i>
</p>
