#!/bin/bash
# Madison IoT External Database - Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Madison IoT External Database${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Check if Excel file exists
EXCEL_FILE="../src/datos_iot_madison.xlsx"
if [ ! -f "$EXCEL_FILE" ]; then
    echo -e "${RED}✗ Excel file not found: $EXCEL_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Excel file found${NC}"
echo ""

# Start containers
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d timescaledb pgadmin

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 5

# Check database health
until docker exec madison_iot_db pg_isready -U postgres -d madison_iot > /dev/null 2>&1; do
    echo -e "${YELLOW}  Waiting for database...${NC}"
    sleep 2
done

echo -e "${GREEN}✓ Database is ready${NC}"
echo ""

# Check if data already exists
DATA_COUNT=$(docker exec madison_iot_db psql -U postgres -d madison_iot -t -c "SELECT COUNT(*) FROM iot.current_readings;" 2>/dev/null || echo "0")
DATA_COUNT=$(echo "$DATA_COUNT" | tr -d '[:space:]')

if [ "$DATA_COUNT" -gt "0" ]; then
    echo -e "${YELLOW}⚠ Data already exists in database (${DATA_COUNT} current readings)${NC}"
    read -p "Do you want to re-import data? This will take several minutes. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Skipping data import${NC}"
    else
        echo -e "${YELLOW}Truncating existing data...${NC}"
        docker exec madison_iot_db psql -U postgres -d madison_iot -c "TRUNCATE iot.current_readings, iot.environmental_readings, iot.temperature_readings;"
        echo -e "${YELLOW}Starting data import (this will take several minutes)...${NC}"
        docker-compose up data_importer
    fi
else
    echo -e "${YELLOW}Starting data import (this will take several minutes)...${NC}"
    docker-compose up data_importer
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Services:"
echo -e "  ${GREEN}•${NC} TimescaleDB: ${BLUE}localhost:5432${NC}"
echo -e "    Database: madison_iot"
echo -e "    User: postgres"
echo -e "    Password: postgres"
echo ""
echo -e "  ${GREEN}•${NC} PgAdmin: ${BLUE}http://localhost:5050${NC}"
echo -e "    Email: admin@madison.local"
echo -e "    Password: admin"
echo ""
echo "Useful commands:"
echo -e "  ${YELLOW}docker-compose logs -f timescaledb${NC}  - View database logs"
echo -e "  ${YELLOW}docker-compose ps${NC}                    - View container status"
echo -e "  ${YELLOW}docker-compose down${NC}                  - Stop all containers"
echo -e "  ${YELLOW}./query.sh${NC}                           - Run sample queries"
echo ""
