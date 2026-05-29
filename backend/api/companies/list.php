<?php

declare(strict_types=1);

require_once __DIR__ . '/../../index.php';
require_once __DIR__ . '/../../database.php';

try {
    $db = getDatabaseConnection();
    $stmt = $db->prepare('SELECT companyId AS id, companyName AS name, companyAddress AS location, companyPhone AS phone FROM Company ORDER BY companyName ASC');
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse(200, [
        'success' => true,
        'data' => $rows,
    ]);
} catch (Throwable $e) {
    jsonResponse(500, ['success' => false, 'message' => 'Failed to fetch companies.']);
}
