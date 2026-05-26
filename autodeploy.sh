#!/bin/bash
# -------------------------------------------------------------------
# Script de Autodeploy Automático (GitHub -> VPS)
# Detecta novos commits no master e executa o deploy.
# -------------------------------------------------------------------

# Garante que o script roda no diretório correto do projeto
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "⏳ [$(date)] Buscando novos commits no GitHub..."
git fetch origin master

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "🚀 [$(date)] Novos commits detectados! Atualizando repositório..."
    
    # Puxa as alterações mais recentes
    git pull origin master
    
    # Atualiza as dependências do workspace (se package.json mudou)
    echo "📦 Instalando/atualizando dependências com pnpm..."
    pnpm install --frozen-lockfile || pnpm install
    
    # Executa o script de deploy padrão (build do frontend e nginx reload)
    if [ -f "./deploy.sh" ]; then
        echo "🔨 Executando ./deploy.sh..."
        chmod +x ./deploy.sh
        ./deploy.sh
    else
        echo "⚠️ Erro: Script ./deploy.sh não encontrado na raiz!"
    fi
    
    # Reinicia o servidor da API (Backend)
    # Se estiver rodando via PM2, tenta recarregar os processos
    if command -v pm2 &> /dev/null; then
        echo "🔄 Reiniciando processos no PM2..."
        pm2 reload all || pm2 restart all
    else
        # Se não usar PM2, tenta matar o processo do tsx/node antigo na porta 3001 e subir novamente
        echo "🔄 PM2 não detectado. Tentando reiniciar processo na porta 3001..."
        API_PID=$(lsof -t -i:3001 || true)
        if [ ! -z "$API_PID" ]; then
            echo "   Matando processo antigo PID: $API_PID"
            kill -9 $API_PID
        fi
        
        # Inicia a API novamente em background de forma limpa
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
    
    echo "✅ [$(date)] Autodeploy concluído com sucesso!"
else
    echo "💤 [$(date)] Nenhuma alteração detectada. O projeto já está atualizado."
fi
