# Instruções de Deploy e Correção de Erros

## 1. Erro de Conexão com o Banco de Dados
O erro abaixo que você encontrou:
`Error: Incompatible wire encryption levels requested on client and server`

Significa que o **Servidor Firebird** (na VPS) está configurado para **EXIGIR** criptografia, mas a nossa aplicação não está conseguindo negociar isso.

### 🔴 Como Corrigir (Na VPS):
1. Acesse a pasta onde o Firebird está instalado (Geralmente `C:\Program Files\Firebird\Firebird_3_0`).
2. Abra o arquivo `firebird.conf` com o Bloco de Notas (como Administrador).
3. Procure a linha `WireCrypt`.
4. Mude para:
   ```ini
   WireCrypt = Enabled
   ```
   *(Se estiver como `Required`, mude para `Enabled`. Se tiver um `#` na frente, remova-o).*
5. Salve o arquivo e **Reinicie o Serviço do Firebird** no Windows (Services.msc).

---

## 2. Atualizando a Aplicação na VPS (Porta 3010)

Para rodar na porta **3010**, você precisa atualizar os arquivos.

### O que copiar?
Recomendo copiar toda a pasta `src` da sua máquina local para a VPS, substituindo a existente.
Isso garante que todas as correções e a nova porta vão junto.

### Passo a Passo na VPS:
1. Pare o servidor atual (Ctrl+C no terminal).
2. Substitua a pasta `src` na VPS pela pasta `src` do seu computador.
3. Verifique o arquivo `src/server/.env` na VPS:
   - Certifique-se que `PORT=3010`.
   - Certifique-se que `DB_DATABASE` aponta para o caminho correto do banco **DENTRO DA VPS**.
   - Exemplo: `DB_DATABASE=C:\Caminho\Na\VPS\BANCOCOLABORAR.FDB`
4. Abra o terminal na pasta `src/server`.
5. Se você não copiou a pasta `node_modules`, rode:
   ```powershell
   npm install
   ```
6. Inicie o servidor:
   ```powershell
   npm start
   ```

Se tudo der certo, aparecerá:
`Server running at http://localhost:3010`
`Successfully connected to Firebird Database!`
