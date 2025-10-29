Country GDP Analytics API  A RESTful API service that provides comprehensive country data with GDP estimations by integrating real-time information from multiple external APIs. 
Features

- Multi-API Integration — Combines data from REST Countries API and Open Exchange Rates API.  
- GDP Estimation — Calculates GDP automatically using population and currency exchange rates.  
- Data Management — Full CRUD operations with MySQL storage and caching.  
- Visual Analytics — Generates GDP summary images for top-performing countries.  
- Flexible Filtering — Supports advanced search, filtering, and sorting.  
- Real-time Updates — Automatic cache refresh and periodic synchronization.  
- Production-Ready — Deployed on Railway with Aiven-managed MySQL (SSL/TLS secured).

 Tech Stack
- Component - Technology -
- Backend - Node.js, Express.js -
- Database - MySQL (Aiven Cloud with SSL/TLS) -
- External APIs - REST Countries API, Open Exchange Rates API -
- Visualization - Canvas -
- Environment Config - Dotenv -
- Testing - Jest, Supertest -


 Prerequisites
- Node.js v14+
- MySQL (local or Aiven Cloud)
- npm or yarn package manager

Setup & Installation
 Clone the Repository
bash
git clone https://github.com/Habeeboss/COUNTRIES-CURRENCY-API
cd COUNTRIES-CURRENCY-API

Install Dependencies
{
  "axios": "^1.13.0",
  "body-parser": "^1.20.2",
  "canvas": "^3.2.0",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "mysql2": "^3.6.0",
  "node-fetch": "^2.6.12"
}
{
  "jest": "^30.2.0",
  "nodemon": "^3.0.1",
  "supertest": "^7.1.4"
}
npm install
To install dependencies; npm install axios@^1.13.0 body-parser@^1.20.2 canvas@^3.2.0 dotenv@^16.3.1 express@^4.18.2 mysql2@^3.6.0 node-fetch@^2.6.12 jest@^30.2.0 nodemon@^3.0.1 supertest@^7.1.4

 Server Configuration
PORT=3000
NODE_ENV=development
CACHE_DIR=./cache

 Database (Aiven or Local)
DB_HOST=host
DB_PORT=1004
DB_USER=avnadmin
DB_PASSWORD=
DB_NAME=defaultdb

 External APIs
EXTERNAL_TIMEOUT_MS=10000

 SSL Configuration (for Aiven)
SSL_CA_PATH=./aiven-ca.pem
Note: The SSL CA certificate (aiven-ca.pem) must exist in your root directory.
If using Aiven, SSL is required for all MySQL connections.

Database Setup  .sql
CREATE DATABASE my_countries_api_data;
USE my_countries_api_data;

CREATE TABLE countries (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_normalized VARCHAR(255) NOT NULL,
    capital VARCHAR(255),
    region VARCHAR(255),
    population BIGINT NOT NULL,
    currency_code VARCHAR(10),
    exchange_rate DECIMAL(15,6),
    estimated_gdp DECIMAL(20,2),
    flag_url TEXT,
    last_refreshed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_name_normalized (name_normalized)
);

CREATE TABLE meta (
    id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
    last_refreshed_at DATETIME
);

For Aiven MySQL (Production)
Tables are automatically created on first startup.
SSL certificate must be available at the path defined in .env.
Running the Application
Development Mode (auto-reload)
npm run dev or npm start

Example API Responses
Get All Countries
GET http://localhost:3000/countries
[
  {
    "id": 61,
    "name": "Afghanistan",
    "region": "Asia",
    "population": 40218234,
    "currency_code": "AFN",
    "exchange_rate": "65.979127",
    "estimated_gdp": "666249036.03",
    "flag_url": "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_the_Taliban.svg"
  }
]
Get Specific Country
GET http://localhost:3000/countries/france
{
  "id": 138,
  "name": "France",
  "capital": "Paris",
  "region": "Europe",
  "population": 67391582,
  "currency_code": "EUR",
  "exchange_rate": "0.858246",
  "estimated_gdp": "78679498842.99",
  "flag_url": "https://flagcdn.com/fr.svg"
}
📙 System Status
GET http://localhost:3000/status
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-29T14:26:19.000Z"
}

📈 GDP Calculation Formula
estimated_gdp = population × random(1000–2000) ÷ exchange_rate
This ensures standardized GDP comparison across countries in USD terms.

Author
Habeeb Olakunle
💼 GitHub: @Habeeboss
📧 Email: sannihabeebo30@gmail.com
