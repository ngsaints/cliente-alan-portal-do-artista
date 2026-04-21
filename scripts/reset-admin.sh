#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DB_NAME="portal_do_artista"
DB_USER="postgres"

echo -e "${YELLOW}=== Reset Admin Credentials ===${NC}"
echo ""

if [ -z "${1:-}" ]; then
  NEW_EMAIL="admin@portaldoartista.com"
else
  NEW_EMAIL="$1"
fi

NEW_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)

sudo -u "$DB_USER" psql -d "$DB_NAME" -c "UPDATE settings SET value = '$NEW_EMAIL' WHERE key = 'admin_user';" > /dev/null 2>&1
sudo -u "$DB_USER" psql -d "$DB_NAME" -c "UPDATE settings SET value = '$NEW_PASS' WHERE key = 'admin_pass';" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Admin credentials updated!${NC}"
  echo ""
  echo -e "  Email:  ${YELLOW}$NEW_EMAIL${NC}"
  echo -e "  Senha:  ${YELLOW}$NEW_PASS${NC}"
  echo ""
  echo -e "${RED}Guarde esta senha com segurança. Ela não será exibida novamente.${NC}"
else
  echo -e "${RED}Erro ao atualizar credenciais.${NC}"
  exit 1
fi
