--petcare/database/tables.sql

-- Criação das tabelas para o banco de dados PetCare
-- Garante que as tabelas sejam criadas com o schema public
SET search_path TO public;

-- Tabela de Pets
CREATE TABLE IF NOT EXISTS pets (
    id_pet SERIAL PRIMARY KEY,
    nome_pet VARCHAR(100) NOT NULL,
    especie VARCHAR(100) NOT NULL,
    raca VARCHAR(100),
    genero VARCHAR(100),
    data_nascimento DATE,
    peso DECIMAL(5,2),
    foto_perfil VARCHAR(255),
    idade INT,
    castrado BOOLEAN
);

-- Tabela de Tutores
CREATE TABLE IF NOT EXISTS tutores (
    id_tutor SERIAL PRIMARY KEY,
    nome_completo VARCHAR(100) NOT NULL,
    celular VARCHAR(15),
    email VARCHAR(100) UNIQUE NOT NULL,
    data_nascimento DATE,
    genero_tutor VARCHAR(50),
    senha VARCHAR(255) NOT NULL,
    foto_perfil_tutor VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP
);

-- Tabela de Clinicas Veterinárias
CREATE TABLE IF NOT EXISTS clinicas_veterinarias (
    id_clinica SERIAL PRIMARY KEY,
    id_tutor INT REFERENCES tutores(id_tutor) ON DELETE CASCADE,
    nome_clinica VARCHAR(100) NOT NULL,
    endereco VARCHAR(255),
    telefone VARCHAR(15),
    email VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS veterinarios (
    id_veterinario SERIAL PRIMARY KEY,
    id_tutor INT REFERENCES tutores(id_tutor) ON DELETE CASCADE,
    id_clinica INT REFERENCES clinicas_veterinarias(id_clinica) ON DELETE SET NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(15),
    email VARCHAR(100),
    especialidade VARCHAR(100)
);

-- Tabela de Associação Tutor-Pet
CREATE TABLE IF NOT EXISTS tutor_pet (
    id_tutor int REFERENCES tutores(id_tutor) ON DELETE CASCADE,
    id_pet int REFERENCES pets(id_pet) ON DELETE CASCADE,
    nivel_permissao_1 VARCHAR(100),
    PRIMARY KEY (id_tutor, id_pet)
);


-- Tabela de Compromissos
CREATE TABLE IF NOT EXISTS compromissos (
    id_compromisso SERIAL PRIMARY KEY,
    id_pet INT REFERENCES pets(id_pet) ON DELETE CASCADE,
    titulo VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_compromisso DATE NOT NULL,
    hora TIME,
    localizacao VARCHAR(255),
    lembrete BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Compras
CREATE TABLE IF NOT EXISTS produtos (
    id_compra SERIAL PRIMARY KEY,
    id_pet INT REFERENCES pets(id_pet) ON DELETE CASCADE,
    nome_produto VARCHAR(100) NOT NULL,
    categoria VARCHAR(100),
    quantidade INT DEFAULT 1,
    consumo_medio INT,
    data_compra DATE DEFAULT CURRENT_DATE,
    preco_compra DECIMAL(10,2),
    loja VARCHAR(100),
    observacoes TEXT,
    consumo_medio VARCHAR(50),
    data_validade DATE
);

-- Tabela de Consultas Veterinárias
CREATE TABLE IF NOT EXISTS consultas (
    id_consulta SERIAL PRIMARY KEY,
    id_pet INT REFERENCES pets(id_pet) ON DELETE CASCADE,
    data_consulta DATE NOT NULL,
    hora TIME,
    motivo TEXT,
    diagnostico TEXT,
    tratamento TEXT,
    id_clinica INT REFERENCES clinicas_veterinarias(id_clinica),
    id_veterinario INT REFERENCES veterinarios(id_veterinario),
    preco_consulta DECIMAL(10,2)
);

-- Tabela de Arquivos de Consultas
CREATE TABLE IF NOT EXISTS arquivos_consultas (
    id_arquivo SERIAL PRIMARY KEY,
    id_consulta INT REFERENCES consultas(id_consulta) ON DELETE CASCADE,
    id_pet INT REFERENCES pets(id_pet),
    nome_arquivo VARCHAR(255) NOT NULL,
    nome_pasta VARCHAR(100),
    tipo_arquivo VARCHAR(50),
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Remedios Preventivos
CREATE TABLE IF NOT EXISTS remedios (
    id_remedio SERIAL PRIMARY KEY,
    id_pet INT REFERENCES pets(id_pet) ON DELETE CASCADE,
    nome_remedio VARCHAR(100) NOT NULL,
    tipo_remedio VARCHAR(100),
    dosagem VARCHAR(100),
    data_inicio DATE,
    data_fim DATE,
    frequencia VARCHAR(100),
    proxima_dose DATE,
    observacoes TEXT,
    preco_remedio DECIMAL(10,2)
);

-- Tabela de Vacinas
CREATE TABLE IF NOT EXISTS vacinas (
    id_vacina SERIAL PRIMARY KEY,
    id_pet INT REFERENCES pets(id_pet) ON DELETE CASCADE,
    nome_vacina VARCHAR(100) NOT NULL,
    lote VARCHAR(100),
    data_vacinacao DATE,
    id_veterinario INT REFERENCES veterinarios(id_veterinario),
    id_clinica INT REFERENCES clinicas_veterinarias(id_clinica),
    proxima_dose DATE,
    preco_vacina DECIMAL(10,2),
    local_aplicacao VARCHAR(100),
    observacoes TEXT
);

