 Country GDP Analytics API

A RESTful API service that provides comprehensive country data with GDP estimations by integrating real-time information from multiple external APIs.

Features
Multi-API Integration: Fetches country data from REST Countries API and exchange rates from Open Exchange Rates API
GDP Estimation: Automatically calculates estimated GDP using population and currency exchange rates
Data Management: Full CRUD operations with MySQL storage and caching
Visual Analytics: Generates summary images of top GDP countries
Flexible Filtering: Advanced filtering, sorting, and search capabilities
Real-time Updates: Automatic data refresh and caching mechanisms

 Setup & Installation
DATABASE setup (Using MySQL Shell)
DATABASE CREATION
CREATE DATABASE my_countries_api_data;
USE my_countries_api_data;
Creation of countries Table
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

Creation of MRTA Table
CREATE TABLE meta (
    id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
    last_refreshed_at DATETIME
);

Connection Command
mysqlsh root@127.0.0.1:3306/my_countries_api_data

Create .env and input the credentials below
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=countries_api
EXTERNAL_TIMEOUT_MS=10000

git clone <your-repo-url>
cd countries-currency-api
npm install
npm run dev

API Endpoints and response example
NigeriaPOSTNigeria  Nigeria http://localhost:3000/countries/refresh Nigeria  Fetch latest data from external APIs, update cache, and regenerate summary image 
{     "updated": 248 }
 NigeriaGETNigeria  Nigeria http://localhost:3000/countries Nigeria  Retrieve all countries with filtering and sorting options 
[     {         "id": 61,         "name": "Afghanistan",         "name_normalized": "afghanistan",         "capital": "Kabul",         "region": "Asia",         "population": 40218234,         "currency_code": "AFN",         "exchange_rate": "65.979127",         "estimated_gdp": "666249036.03",         "flag_url": "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_the_Taliban.svg",         "last_refreshed_at": "2025-10-29T14:26:19.000Z",         "created_at": "2025-10-28T15:48:54.000Z",         "updated_at": "2025-10-29T14:26:19.000Z"     },     {         "id": 62,         "name": "Åland Islands",         "name_normalized": "åland islands",         "capital": "Mariehamn",         "region": "Europe",         "population": 28875,         "currency_code": "EUR",         "exchange_rate": "0.858246",         "estimated_gdp": "38690829.90",         "flag_url": "https://flagcdn.com/ax.svg",         "last_refreshed_at": "2025-10-29T14:26:19.000Z",         "created_at": "2025-10-28T15:48:54.000Z",         "updated_at": "2025-10-29T14:26:19.000Z"     },     {         "id": 63,         "name": "Albania",         "name_normalized": "albania",         "capital": "Tirana",         "region": "Europe",         "population": 2837743,         "currency_code": "ALL",         "exchange_rate": "83.131050",         "estimated_gdp": "49189654.92",         "flag_url": "https://flagcdn.com/al.svg",         "last_refreshed_at": "2025-10-29T14:26:19.000Z",         "created_at": "2025-10-28T15:48:54.000Z",         "updated_at": "2025-10-29T14:26:19.000Z"     },
 NigeriaGETNigeria  Nigeria http://localhost:3000/countries/:name Nigeria  Get specific country details (case-insensitive) 
http://localhost:3000/countries/france 
{     "id": 138,     "name": "France",     "name_normalized": "france",     "capital": "Paris",     "region": "Europe",     "population": 67391582,     "currency_code": "EUR",     "exchange_rate": "0.858246",     "estimated_gdp": "78679498842.99",     "flag_url": "https://flagcdn.com/fr.svg",     "last_refreshed_at": "2025-10-29T14:26:19.000Z",     "created_at": "2025-10-28T15:48:54.000Z",     "updated_at": "2025-10-29T14:26:20.000Z" }
 NigeriaPOSTNigeria  Nigeria http://localhost:3000/countries/addNigeria  Manually add or update country information 
{   "name": "Nigeria",   "capital": "Abuja",   "region": "Africa",   "population": 206139587,   "currency_code": "NGN",   "exchange_rate": 760.50,   "estimated_gdp": 5000000000,   "flag_url": "https://flagcdn.com/ng.svg" }  response.json 
{     "message": "Country Nigeria added/updated successfully" }

 NigeriaDELETENigeria  Nigeria http://localhost:3000/countries/:name Nigeria  Remove a country from the database 

 NigeriaGETNigeria  Nigeria http://localhost:3000/countries/status Nigeria  Check system status and last update timestamp 
{     "total_countries": 250,     "last_refreshed_at": "2025-10-29T14:26:19.000Z" }

 NigeriaGETNigeria  Nigeria http://localhost:3000/countries/image Nigeria  Serve cached summary visualization 
 
GET http://localhost:3000/countries/gdp/top?limit=3 Get top 3 countries by estimated GDP 
[     {         "id": 300,         "name": "United States of America",         "name_normalized": "united states of america",         "capital": "Washington, D.C.",         "region": "Americas",         "population": 329484123,         "currency_code": "USD",         "exchange_rate": "1.000000",         "estimated_gdp": "378247773204.00",         "flag_url": "https://flagcdn.com/us.svg",         "last_refreshed_at": "2025-10-29T06:30:22.000Z",         "created_at": "2025-10-28T15:48:55.000Z",         "updated_at": "2025-10-29T06:30:24.000Z"     },     {         "id": 109,         "name": "China",         "name_normalized": "china",         "capital": "Beijing",         "region": "Asia",         "population": 1402112000,         "currency_code": "CNY",         "exchange_rate": "7.098654",         "estimated_gdp": "307338020982.57",         "flag_url": "https://flagcdn.com/cn.svg",         "last_refreshed_at": "2025-10-29T06:30:22.000Z",         "created_at": "2025-10-28T15:48:54.000Z",         "updated_at": "2025-10-29T06:30:22.000Z"     }]

GDP Calculation
The estimated GDP is calculated using the formula:
estimated_gdp = population × random(1000–2000) ÷ exchange_rate
This provides a standardized comparison metric across all countries using USD as the base currency.

 External API Integration
- Country Data: Nigeria https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currenciesNigeria
- Exchange Rates: Nigeria 
https://open.er-api.com/v6/latest/USDNigeria
