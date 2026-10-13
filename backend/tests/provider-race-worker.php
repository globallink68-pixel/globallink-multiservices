<?php

require __DIR__.'/../vendor/autoload.php';
$input = json_decode(trim(fgets(STDIN)), true, flags: JSON_THROW_ON_ERROR);
$config = $input['connection'];
if (! in_array($config['host'], ['127.0.0.1', 'localhost'], true) || (int) $config['port'] !== 3312 || $config['database'] !== 'globallink_phase1_test') {
    exit(2);
}
$pdo = new PDO('mysql:host='.$config['host'].';port=3312;dbname=globallink_phase1_test;charset=utf8mb4', $config['username'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$identity = $pdo->query('SELECT DATABASE() AS db, @@port AS port, @@datadir AS datadir')->fetch(PDO::FETCH_ASSOC);
$expectedDirectory = realpath(__DIR__.'/../../tools/mysql-data');
if ($identity['db'] !== 'globallink_phase1_test' || (int) $identity['port'] !== 3312 || $expectedDirectory === false || strtolower(rtrim(str_replace('\\', '/', $identity['datadir']), '/')) !== strtolower(str_replace('\\', '/', $expectedDirectory))) {
    exit(2);
}
$pdo->exec('SET SESSION innodb_lock_wait_timeout=5');
echo "attempting\n";
fflush(STDOUT);
try {
    if ($input['operation']['type'] === 'associate') {
        $statement = $pdo->prepare('INSERT INTO bank_service_details(service_id,provider_id) VALUES (?,?)');
        $statement->execute([$input['operation']['service_id'], $input['operation']['provider_id']]);
    } else {
        $pdo->prepare('INSERT INTO providers(name,code,is_active,sort_order) VALUES (?,?,1,0)')->execute(['Synthetic race provider', 'QA_RACE']);
    }
    echo json_encode(['outcome' => 'committed']);
} catch (PDOException $exception) {
    echo json_encode(['outcome' => 'rejected', 'sql_state' => $exception->errorInfo[0] ?? null, 'driver_code' => (int) ($exception->errorInfo[1] ?? 0)]);
}
