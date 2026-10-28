<?php

// Use the credentials injected by the Pantheon recipe, not a root connection.
$localPantheon = [
    'host' => getenv('DB_HOST'),
    'port' => getenv('DB_PORT'),
    'database' => getenv('DB_NAME'),
    'username' => getenv('DB_USER'),
    'password' => getenv('DB_PASSWORD'),
];
if ($localPantheon !== [
    'host' => 'database',
    'port' => '3306',
    'database' => 'pantheon',
    'username' => 'pantheon',
    'password' => 'pantheon',
]) {
    throw new RuntimeException('Unexpected local Pantheon credentials');
}
$pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $localPantheon['host'], $localPantheon['port'], $localPantheon['database']),
    $localPantheon['username'],
    $localPantheon['password'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$expected = ['1' => 'Pantheon café 🌈', '2' => 'MySQL 日本語 🚀'];
$mode = $argv[1] ?? 'rows';
switch ($mode) {
    case 'server':
        $server = $pdo->query('SELECT VERSION(), @@version_comment, @@character_set_server,
            @@collation_server, @@transaction_isolation')->fetch(PDO::FETCH_NUM);
        if (!preg_match('/^8\.4\./', $server[0]) || !preg_match('/MySQL|Source distribution/i', $server[1]) ||
            stripos($server[1], 'mariadb') !== false || array_slice($server, 2) !== [
                'utf8mb4', 'utf8mb4_0900_ai_ci', 'READ-COMMITTED',
            ]) {
            throw new RuntimeException('Unexpected MySQL server settings: ' . json_encode($server));
        }
        echo implode(' / ', $server) . PHP_EOL;
        break;
    case 'seed':
        $pdo->exec('DROP TABLE IF EXISTS mysql84_example');
        // Inherit the database/server defaults; do not mask a recipe config regression.
        $pdo->exec('CREATE TABLE mysql84_example (id INT PRIMARY KEY, message VARCHAR(100) NOT NULL)');
        $insert = $pdo->prepare('INSERT INTO mysql84_example VALUES (?, ?)');
        foreach ($expected as $id => $message) {
            $insert->execute([$id, $message]);
        }
        $table = $pdo->query("SELECT ENGINE, TABLE_COLLATION FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mysql84_example'")->fetch(PDO::FETCH_NUM);
        if ($table !== ['InnoDB', 'utf8mb4_0900_ai_ci']) {
            throw new RuntimeException('Unexpected table defaults: ' . json_encode($table));
        }
        // Continue into the same non-vacuous row check used after both imports.
    case 'rows':
        $actual = $pdo->query('SELECT id, message FROM mysql84_example ORDER BY id')->fetchAll(PDO::FETCH_KEY_PAIR);
        if ($actual !== $expected) {
            throw new RuntimeException('Unicode rows differ: ' . json_encode($actual));
        }
        echo 'Verified both Unicode rows via Pantheon PDO credentials' . PHP_EOL;
        break;
    case 'empty':
        $pdo->exec('DELETE FROM mysql84_example');
        if ((int) $pdo->query('SELECT COUNT(*) FROM mysql84_example')->fetchColumn() !== 0) {
            throw new RuntimeException('Table was not emptied before import');
        }
        echo 'Verified table is empty before import' . PHP_EOL;
        break;
    default:
        throw new RuntimeException('Unknown verification mode: ' . $mode);
}
