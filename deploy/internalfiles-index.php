<?php
/**
 * Deploy as index.php on internalfiles.maroonsol.com (or set INTERNAL_FILES_UPLOAD_URL to this script).
 *
 * Environment: set UPLOAD_SECRET in this file or via getenv('INTERNAL_FILES_UPLOAD_SECRET') if you configure the server.
 * Files are stored under: {BASE_DIR}/client/{businessId}/accounts/GST/...
 *
 * POST fields:
 *   secret              — must match Next.js INTERNAL_FILES_UPLOAD_SECRET
 *   business_id         — BusinessInfo id (alphanumeric/cuid)
 *   kind                — monthly | quarterly | registration | amendment
 *   fiscal_year         — e.g. 2025-26 (for monthly/quarterly filing)
 *   period              — 01–12 or Q1–Q4
 *   filledSummary       — optional file
 *   challan             — optional file
 *
 * Response JSON: { "filledSummaryFileUrl": "...", "challanFileUrl": "..." }
 */

header('Content-Type: application/json; charset=utf-8');

// --- Configuration ---
$BASE_DIR = __DIR__ . '/storage'; // change or symlink to your document root subfolder
$PUBLIC_BASE_URL = 'https://internalfiles.maroonsol.com'; // URL prefix for returned links

if (!is_dir($BASE_DIR)) {
    mkdir($BASE_DIR, 0755, true);
}
// Prefer server env; fallback for quick drop-in:
$UPLOAD_SECRET = getenv('INTERNAL_FILES_UPLOAD_SECRET') ?: 'CHANGE_ME_TO_MATCH_NEXTJS';

// --- Helpers ---
function json_fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function safe_business_id(string $id): bool {
    return (bool) preg_match('/^[a-zA-Z0-9_-]{8,64}$/', $id);
}

function safe_fiscal_year(string $fy): bool {
    return (bool) preg_match('/^\d{4}-\d{2}$/', $fy);
}

function safe_period(string $p): bool {
    return (bool) preg_match('/^(0[1-9]|1[0-2])$/', $p) || (bool) preg_match('/^Q[1-4]$/', $p);
}

function ensure_dir(string $path): void {
    if (!is_dir($path)) {
        if (!mkdir($path, 0755, true)) {
            json_fail(500, 'Could not create directory');
        }
    }
}

function save_upload(string $field, string $destDir, string $prefix): ?string {
    if (!isset($_FILES[$field]) || $_FILES[$field]['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
        json_fail(400, 'Upload error for ' . $field);
    }
    $name = basename($_FILES[$field]['name']);
    $name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
    $stamp = date('YmdHis');
    $final = $destDir . '/' . $prefix . '_' . $stamp . '_' . $name;
    if (!move_uploaded_file($_FILES[$field]['tmp_name'], $final)) {
        json_fail(500, 'Could not save ' . $field);
    }
    return $final;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_fail(405, 'Method not allowed');
}

$secret = $_POST['secret'] ?? '';
if ($secret === '' || !hash_equals($UPLOAD_SECRET, $secret)) {
    json_fail(403, 'Forbidden');
}

$businessId = $_POST['business_id'] ?? '';
$kind = $_POST['kind'] ?? '';

if (!safe_business_id($businessId)) {
    json_fail(400, 'Invalid business_id');
}

$allowedKinds = ['monthly', 'quarterly', 'registration', 'amendment'];
if (!in_array($kind, $allowedKinds, true)) {
    json_fail(400, 'Invalid kind');
}

$relBase = 'client/' . $businessId . '/accounts/GST';

if ($kind === 'registration') {
    $destDir = $BASE_DIR . '/' . $relBase . '/registration';
} elseif ($kind === 'amendment') {
    $destDir = $BASE_DIR . '/' . $relBase . '/amendment';
} else {
    $fiscalYear = $_POST['fiscal_year'] ?? '';
    $period = $_POST['period'] ?? '';
    if (!safe_fiscal_year($fiscalYear) || !safe_period($period)) {
        json_fail(400, 'Invalid fiscal_year or period');
    }
    $destDir = $BASE_DIR . '/' . $relBase . '/filling/' . $fiscalYear . '/' . $period;
}

ensure_dir($destDir);

$summaryPath = save_upload('filledSummary', $destDir, 'summary');
$challanPath = save_upload('challan', $destDir, 'challan');

$toUrl = function (?string $absPath) use ($PUBLIC_BASE_URL, $BASE_DIR) {
    if ($absPath === null || $absPath === '') {
        return null;
    }
    $rel = ltrim(str_replace(realpath($BASE_DIR) ?: $BASE_DIR, '', realpath($absPath) ?: $absPath), '/');
    return rtrim($PUBLIC_BASE_URL, '/') . '/storage/' . $rel;
};

// If document root serves /storage as alias to $BASE_DIR, URLs work. Adjust if you map differently.
$filledSummaryFileUrl = $toUrl($summaryPath);
$challanFileUrl = $toUrl($challanPath);

echo json_encode([
    'filledSummaryFileUrl' => $filledSummaryFileUrl,
    'challanFileUrl' => $challanFileUrl,
]);
