#!/bin/bash
# -------------------------------------------------------------------
# Script de Autodeploy com Sub-rotina de Detecção de Erros e Logs
# Monitora o GitHub e registra o resultado em /logs
# -------------------------------------------------------------------

# Garante que o script roda no diretório correto do projeto
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Busca atualizações silenciosamente do repositório remoto
git fetch origin master > /dev/null 2>&1

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

# Só inicia o processo se houver alterações no repositório remoto
if [ "$LOCAL" != "$REMOTE" ]; then
    # Cria a pasta de logs caso ela não exista
    mkdir -p logs

    LOG_FILE="logs/deploy_$(date +%Y-%m-%d_%H-%M-%S).log"
    HISTORY_FILE="logs/deploy_history.log"
    LATEST_LOG="logs/latest_deploy.log"

    # Sub-rotina de detecção de erros (ERR trap)
    on_error() {
        local exit_code=$?
        local failed_command="$BASH_COMMAND"
        echo ""
        echo "❌ [$(date)] ERRO: O deploy falhou na instrução: '$failed_command' com código de saída $exit_code."
        
        # Grava no log de histórico simplificado
        echo "[$(date)] ERROR - Commit: $(git rev-parse --short origin/master || echo 'unknown') - Falhou no comando '$failed_command' (código: $exit_code)" >> "$HISTORY_FILE"
        
        # Cria cópia/link do último deploy com falha
        cp "$LOG_FILE" "$LATEST_LOG" 2>/dev/null || true
        exit $exit_code
    }
    
    # Associa a sub-rotina de erro ao sinal ERR
    trap 'on_error' ERR
    set -e # Interrompe a execução imediatamente caso algum comando retorne código diferente de zero

    # Redireciona a saída padrão (stdout) e erros (stderr) do bloco inteiro para o arquivo de log e console
    exec > >(tee -a "$LOG_FILE") 2>&1

    echo "======================================================="
    echo "🚀 [$(date)] Novo commit detectado! Iniciando autodeploy..."
    echo "======================================================="
    echo "Commit Local:  $LOCAL"
    echo "Commit Remoto: $REMOTE"
    echo "Arquivo de log: $LOG_FILE"
    echo "-------------------------------------------------------"
    
    # Puxa as alterações do repositório
    echo "⬇️ Puxando alterações do GitHub..."
    git pull origin master
    
    # Instala/atualiza dependências usando pnpm
    echo "📦 Instalando/atualizando dependências com pnpm..."
    pnpm install --frozen-lockfile || pnpm install
    
    # Executa o script de build e reload padrão
    if [ -f "./deploy.sh" ]; then
        echo "🔨 Executando ./deploy.sh..."
        chmod +x ./deploy.sh
        ./deploy.sh
    else
        echo "⚠️ Erro: Script ./deploy.sh não encontrado na raiz!"
        exit 1
    fi
    
    # Reinicia a API (Backend)
    if command -v pm2 &> /dev/null; then
        echo "🔄 Reiniciando processos no PM2..."
        pm2 reload all || pm2 restart all
    else
        echo "🔄 PM2 não detectado. Reiniciando processo na porta 3001..."
        API_PID=$(lsof -t -i:3001 || true)
        if [ ! -z "$API_PID" ]; then
            echo "   Matando processo antigo PID: $API_PID"
            kill -9 $API_PID
        fi
        
        if [ -f "./start-api.sh" ]; then
            echo "   Iniciando API via ./start-api.sh..."
            chmod +x ./start-api.sh
            ./start-api.sh &
        elif [ -f "./start.sh" ]; then
            echo "   Iniciando via ./start.sh..."
            chmod +x ./start.sh
            ./start.sh &
        fi
    fi
    
    echo ""
    echo "======================================================="
    echo "✅ [$(date)] Autodeploy concluído com sucesso!"
    echo "======================================================="
    
    # Registra o sucesso no histórico
    echo "[$(date)] SUCCESS - Commit: $(git rev-parse --short HEAD) - Deploy realizado com sucesso." >> "$HISTORY_FILE"
    
    # Atualiza o atalho de último log de deploy
    cp "$LOG_FILE" "$LATEST_LOG" 2>/dev/null || true
fi
