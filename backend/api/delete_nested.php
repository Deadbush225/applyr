<?php

declare(strict_types=1);

require_once __DIR__ . '/../index.php';
require_once __DIR__ . '/auth/require_auth.php';

[$db, $user] = requireAuthUser();
$input = readJsonInput();
$type = trim((string)($input['type'] ?? ($_GET['type'] ?? '')));
$id = trim((string)($input['id'] ?? ($_GET['id'] ?? '')));

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    jsonResponse(405, [
        'success' => false,
        'message' => 'Method not allowed.',
    ]);
    exit;
}

if ($type === '' || $id === '') {
    jsonResponse(422, [
        'success' => false,
        'message' => 'Type and ID are required.',
    ]);
    exit;
}

try {
    $db->beginTransaction();

    switch ($type) {
        case 'education':
            $stmt = $db->prepare('DELETE FROM Education WHERE educationId = :id');
            $stmt->execute(['id' => $id]);
            break;
        case 'employment':
            $stmt = $db->prepare('DELETE FROM EmploymentHistory WHERE EmploymentHistoryId = :id');
            $stmt->execute(['id' => $id]);
            break;
        case 'certificate':
            // Certificates are tied via ApplicantCertificate. Deleting the certificate should cascade or we delete it directly.
            // Wait, what if it's shared? Best to delete from ApplicantCertificate first.
            $stmt = $db->prepare('DELETE FROM ApplicantCertificate WHERE certificateId = :id');
            $stmt->execute(['id' => $id]);
            // Optional: delete from Certificate if no longer used.
            $stmt = $db->prepare('DELETE FROM Certificate WHERE certificateId = :id');
            $stmt->execute(['id' => $id]);
            break;
        case 'training':
            // Trainings are tied via ApplicantTraining.
            $stmt = $db->prepare('DELETE FROM ApplicantTraining WHERE trainingId = :id');
            $stmt->execute(['id' => $id]);
            // Optional: delete from Training if no longer used.
            $stmt = $db->prepare('DELETE FROM Training WHERE trainingId = :id');
            $stmt->execute(['id' => $id]);
            break;
        case 'reference':
            $stmt = $db->prepare('DELETE FROM Reference WHERE referenceId = :id');
            $stmt->execute(['id' => $id]);
            break;
        default:
            throw new Exception('Invalid deletion type.');
    }

    $db->commit();

    jsonResponse(200, [
        'success' => true,
        'message' => ucfirst($type) . ' deleted successfully.',
    ]);
} catch (Throwable $error) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    
    jsonResponse(500, [
        'success' => false,
        'message' => 'Database Error: ' . $error->getMessage()
    ]);
}
