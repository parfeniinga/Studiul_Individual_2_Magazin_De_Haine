<?php
// API simplu: PHP + MySQL (XAMPP). Baza de date și tabelele se creează automat.
header('Content-Type: application/json; charset=utf-8');

// Setări conexiune (în XAMPP implicit: utilizator root, fără parolă)
$host = 'localhost';
$utilizator = 'root';
$parola = '';
$baza = 'magazin_haine';

function raspuns($date, $cod = 200) {
    http_response_code($cod);
    echo json_encode($date, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = new PDO("mysql:host=$host;charset=utf8mb4", $utilizator, $parola, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    raspuns(['eroare' => 'Nu mă pot conecta la MySQL. Pornește MySQL din XAMPP.'], 500);
}

$db->exec("CREATE DATABASE IF NOT EXISTS `$baza` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
$db->exec("USE `$baza`");

$db->exec("CREATE TABLE IF NOT EXISTS produse (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nume VARCHAR(150) NOT NULL,
    categorie VARCHAR(80) NOT NULL,
    pret DECIMAL(10,2) NOT NULL,
    stoc INT NOT NULL,
    img VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$db->exec("CREATE TABLE IF NOT EXISTS comenzi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client VARCHAR(150) NOT NULL,
    produs_id INT NOT NULL,
    produs VARCHAR(150) NOT NULL,
    cantitate INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    stare VARCHAR(20) NOT NULL DEFAULT 'Nouă',
    data_comanda VARCHAR(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Produse de pornire (doar dacă tabelul e gol)
if ($db->query("SELECT COUNT(*) FROM produse")->fetchColumn() == 0) {
    $ins = $db->prepare("INSERT INTO produse (nume, categorie, pret, stoc, img) VALUES (?,?,?,?,?)");
    foreach ([
        ['Cămașă din in', 'Cămăși', 289, 12, 'images/camasa-in.jpg'],
        ['Rochie midi', 'Rochii', 459, 6, 'images/rochie-midi.jpg'],
        ['Pantaloni drepți', 'Pantaloni', 329, 3, 'images/pantaloni-drepti.jpg'],
        ['Pulover tricotat', 'Pulovere', 369, 9, 'images/pulover-tricotat.jpg'],
        ['Cămașă în dungi', 'Cămăși', 259, 0, 'images/camasa-dungi.jpg'],
        ['Rochie de seară', 'Rochii', 599, 4, 'images/rochie-seara.jpg'],
    ] as $p) $ins->execute($p);
}

function salveazaFoto() {
    $f = $_FILES['foto'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) throw new Exception('Alege o fotografie (maxim 2 MB).');
    $info = @getimagesize($f['tmp_name']);
    $tip = $info ? $info[2] : 0;
    $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$tip] ?? null;
    if (!$ext) throw new Exception('Fotografia trebuie să fie JPG, PNG sau WEBP.');
    if (!is_dir(__DIR__ . '/images')) mkdir(__DIR__ . '/images');
    $nume = bin2hex(random_bytes(8)) . '.' . $ext;
    move_uploaded_file($f['tmp_name'], __DIR__ . '/images/' . $nume);
    return 'images/' . $nume;
}

$actiune = $_GET['action'] ?? 'data';

try {
    switch ($actiune) {
        case 'data':
            raspuns([
                'produse' => $db->query("SELECT * FROM produse ORDER BY id")->fetchAll(PDO::FETCH_ASSOC),
                'comenzi' => $db->query("SELECT id, client, produs_id AS produsId, produs, cantitate, total, stare, data_comanda AS data
                                         FROM comenzi ORDER BY id")->fetchAll(PDO::FETCH_ASSOC),
            ]);

        case 'add_product':
            $nume = trim($_POST['nume'] ?? '');
            $cat = trim($_POST['categorie'] ?? '');
            $pret = (float)($_POST['pret'] ?? 0);
            $stoc = (int)($_POST['stoc'] ?? -1);
            if ($nume === '' || $cat === '' || $pret <= 0 || $stoc < 0) throw new Exception('Completează corect toate câmpurile.');
            $img = salveazaFoto();
            $db->prepare("INSERT INTO produse (nume, categorie, pret, stoc, img) VALUES (?,?,?,?,?)")
               ->execute([$nume, $cat, $pret, $stoc, $img]);
            raspuns(['ok' => true]);

        case 'set_stock':
            $db->prepare("UPDATE produse SET stoc = ? WHERE id = ?")
               ->execute([max(0, (int)$_POST['stoc']), (int)$_POST['id']]);
            raspuns(['ok' => true]);

        case 'delete_product':
            $db->prepare("DELETE FROM produse WHERE id = ?")->execute([(int)$_POST['id']]);
            raspuns(['ok' => true]);

        case 'add_order':
            $db->beginTransaction();
            $q = $db->prepare("SELECT * FROM produse WHERE id = ?");
            $q->execute([(int)$_POST['produs']]);
            $p = $q->fetch(PDO::FETCH_ASSOC);
            $cant = (int)($_POST['cantitate'] ?? 0);
            $client = trim($_POST['client'] ?? '');
            if (!$p || $client === '') throw new Exception('Date incomplete.');
            if ($cant < 1 || $cant > $p['stoc']) throw new Exception("Stoc insuficient (disponibil: {$p['stoc']}).");
            $db->prepare("UPDATE produse SET stoc = stoc - ? WHERE id = ?")->execute([$cant, $p['id']]);
            $db->prepare("INSERT INTO comenzi (client, produs_id, produs, cantitate, total, stare, data_comanda)
                          VALUES (?,?,?,?,?,?,?)")
               ->execute([$client, $p['id'], $p['nume'], $cant, $cant * $p['pret'], 'Nouă', date('d.m.Y')]);
            $db->commit();
            raspuns(['ok' => true]);

        case 'set_status':
            $stare = $_POST['stare'] ?? '';
            if (!in_array($stare, ['Nouă', 'Livrată', 'Anulată'], true)) throw new Exception('Stare invalidă.');
            $q = $db->prepare("SELECT * FROM comenzi WHERE id = ?");
            $q->execute([(int)$_POST['id']]);
            $c = $q->fetch(PDO::FETCH_ASSOC);
            if (!$c) throw new Exception('Comandă inexistentă.');
            $db->beginTransaction();
            // anulare = produsele revin în stoc; reactivare = se scad din nou
            if ($stare === 'Anulată' && $c['stare'] !== 'Anulată')
                $db->prepare("UPDATE produse SET stoc = stoc + ? WHERE id = ?")->execute([$c['cantitate'], $c['produs_id']]);
            if ($c['stare'] === 'Anulată' && $stare !== 'Anulată')
                $db->prepare("UPDATE produse SET stoc = GREATEST(0, stoc - ?) WHERE id = ?")->execute([$c['cantitate'], $c['produs_id']]);
            $db->prepare("UPDATE comenzi SET stare = ? WHERE id = ?")->execute([$stare, $c['id']]);
            $db->commit();
            raspuns(['ok' => true]);

        default:
            throw new Exception('Acțiune necunoscută.');
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    raspuns(['eroare' => $e->getMessage()], 400);
}