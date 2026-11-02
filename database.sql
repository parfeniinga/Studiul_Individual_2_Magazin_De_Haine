CREATE DATABASE IF NOT EXISTS magazin_haine CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE magazin_haine;
 
CREATE TABLE IF NOT EXISTS produse (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nume VARCHAR(150) NOT NULL,
  categorie VARCHAR(80) NOT NULL,
  pret DECIMAL(10,2) NOT NULL,
  stoc INT NOT NULL,
  img VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 
CREATE TABLE IF NOT EXISTS comenzi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client VARCHAR(150) NOT NULL,
  produs_id INT NOT NULL,
  produs VARCHAR(150) NOT NULL,
  cantitate INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  stare VARCHAR(20) NOT NULL DEFAULT 'Nouă',
  data_comanda VARCHAR(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 
INSERT INTO produse (nume, categorie, pret, stoc, img) VALUES
('Cămașă din in', 'Cămăși', 289, 12, 'images/camasa-in.jpg'),
('Rochie midi', 'Rochii', 459, 6, 'images/rochie-midi.jpg'),
('Pantaloni drepți', 'Pantaloni', 329, 3, 'images/pantaloni-drepti.jpg'),
('Pulover tricotat', 'Pulovere', 369, 9, 'images/pulover-tricotat.jpg'),
('Cămașă în dungi', 'Cămăși', 259, 0, 'images/camasa-dungi.jpg'),
('Rochie de seară', 'Rochii', 599, 4, 'images/rochie-seara.jpg');