CREATE TABLE IF NOT EXISTS countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_normalized VARCHAR(255) NOT NULL UNIQUE,
  capital VARCHAR(255),
  region VARCHAR(255),
  population BIGINT NOT NULL,
  currency_code VARCHAR(10),
  exchange_rate DECIMAL(15,6),
  estimated_gdp DECIMAL(20,2),
  flag_url TEXT,
  last_refreshed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meta (
  id TINYINT PRIMARY KEY,
  last_refreshed_at DATETIME
);


INSERT INTO meta (id, last_refreshed_at) VALUES (1, NULL)
  ON DUPLICATE KEY UPDATE id = id;
