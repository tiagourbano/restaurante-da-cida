-- 1. Tabela de Empresas (Mantida)
CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    trabalha_fim_semana BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Setores (Mantida)
CREATE TABLE setores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    empresa_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    hora_corte_visualizacao TIME DEFAULT '23:59:00',
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

-- 3. Janelas de Horário (Mantida)
CREATE TABLE janelas_pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setor_id INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    descricao VARCHAR(50),
    FOREIGN KEY (setor_id) REFERENCES setores(id)
);

-- 4. Funcionários (Mantida)
CREATE TABLE funcionarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    ra_cpf VARCHAR(20) NOT NULL UNIQUE,
    data_nascimento DATE DEFAULT NULL;
    setor_id INT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (setor_id) REFERENCES setores(id)
);

-- 5. Tamanhos e Preços (Mantida)
CREATE TABLE tamanhos_marmita (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);

-- 6. Cardápio Diário (Mantida)
CREATE TABLE cardapios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_servico DATE NOT NULL,
    prato_principal VARCHAR(200) NOT NULL,
    guarnicoes VARCHAR(255),
    bloqueado BOOLEAN DEFAULT FALSE
);

-- 7. [NOVA] Tabela de Opções Extras (Onde você cadastra tudo)
-- Aqui entram: "Sem Feijão", "Com Salada", "Trocar por Ovo", etc.
CREATE TABLE opcoes_extras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,    -- Ex: "Ovo Frito", "Sem Feijão"
    tipo VARCHAR(50) NOT NULL,     -- Ex: 'TROCA', 'REMOCAO', 'ADICIONAL'
    ordem_exibicao INT DEFAULT 0,  -- Para controlar a ordem na tela
    ativo BOOLEAN DEFAULT TRUE
);

-- 8. [MODIFICADA] Tabela de Pedidos
-- Removemos as colunas fixas. Agora ela só guarda o "quem" e o "quando".
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionario_id INT NOT NULL,
    cardapio_id INT NOT NULL,
    tamanho_id INT NOT NULL,
    observacao TEXT,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PENDENTE', 'EM_PREPARO', 'ENTREGUE', 'CANCELADO') DEFAULT 'PENDENTE',

    FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id),
    FOREIGN KEY (cardapio_id) REFERENCES cardapios(id),
    FOREIGN KEY (tamanho_id) REFERENCES tamanhos_marmita(id),

    UNIQUE KEY unico_pedido_dia (funcionario_id, cardapio_id)
);

-- 9. [NOVA] Tabela de Ligação (Pedido <-> Opções)
-- Aqui fica gravado o que o funcionário escolheu
CREATE TABLE pedido_opcoes_escolhidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    opcao_extra_id INT NOT NULL,

    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (opcao_extra_id) REFERENCES opcoes_extras(id)
);

-- 10. [NOVA] Tabela de Usuarios do sistema
-- Aqui fica gravado o perfil de cada usuario
CREATE TABLE usuarios_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    login VARCHAR(50) NOT NULL UNIQUE, -- Pode ser email ou um usuario simples ex: 'metalurgica'
    senha VARCHAR(255) NOT NULL, -- Vamos guardar criptografado (Hash)
    perfil ENUM('ADMIN', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE',
    empresa_id INT NULL, -- Se for NULL é Admin Geral. Se tiver ID, é restrito.
    ativo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

-- --- EXEMPLO DE CARGA INICIAL (SEED) PARA VOCÊ ENTENDER ---
-- INSERT INTO opcoes_extras (nome, tipo, ordem_exibicao) VALUES
-- ('Com Salada', 'ADICIONAL', 1),
-- ('Sem Feijão', 'REMOCAO', 2),
-- ('Trocar por Ovo Frito', 'TROCA', 3),
-- ('Trocar por Omelete', 'TROCA', 4),
-- ('Trocar por Filé de Frango', 'TROCA', 5);

-- OBS: Essa hash abaixo é um exemplo fictício, você vai gerar a senha real no código em breve.
-- Se quiser testar agora, instale o bcryptjs e gere um hash, ou use o código de cadastro que faremos abaixo.
-- INSERT INTO usuarios_sistema (nome, login, senha, perfil, empresa_id) VALUES ('Administrador', 'admin', '$2b$10$A6sOZWUhulsZBgZEqQcxLO/hirG1RsTq8HxFNufVyKNFV9Yj.CQgm', 'ADMIN', NULL);