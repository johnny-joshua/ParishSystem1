<?php

require_once __DIR__ . '/../../config/init.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit('Method not allowed');
}

$db = getDB();

$format = $_GET['format'] ?? 'csv';
$from = $_GET['from'] ?? '';
$to = $_GET['to'] ?? '';
$period = $_GET['period'] ?? 'monthly';
$year = (int) ($_GET['year'] ?? date('Y'));
$month = (int) ($_GET['month'] ?? date('n'));
$status = $_GET['status'] ?? '';
$search = $_GET['search'] ?? '';
$category = $_GET['category'] ?? 'all';

$where = 'WHERE 1=1';
$params = [];

if ($from !== '') {
    $where .= ' AND DATE(created_at) >= ?';
    $params[] = $from;
}
if ($to !== '') {
    $where .= ' AND DATE(created_at) <= ?';
    $params[] = $to;
}

switch ($period) {
    case 'daily':
        $where .= ' AND DATE(created_at) = CURDATE()';
        break;
    case 'weekly':
        $where .= ' AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)';
        break;
    case 'monthly':
        $where .= ' AND YEAR(created_at) = ? AND MONTH(created_at) = ?';
        $params[] = $year;
        $params[] = $month;
        break;
    case 'yearly':
        $where .= ' AND YEAR(created_at) = ?';
        $params[] = $year;
        break;
}

$data = [];
$filename = '';

switch ($category) {
    case 'reservations':
        if ($status !== '') {
            $where .= ' AND status = ?';
            $params[] = $status;
        }
        if ($search !== '') {
            $where .= ' AND (fullname LIKE ? OR email LIKE ? OR service_type LIKE ?)';
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        $sql = "SELECT r.*, u.fullname, u.email, u.phone 
                FROM reservations r 
                JOIN users u ON r.user_id = u.id 
                $where 
                ORDER BY r.reservation_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();
        $filename = 'reservations_report';
        break;

    case 'appointments':
        if ($status !== '') {
            $where .= ' AND status = ?';
            $params[] = $status;
        }
        if ($search !== '') {
            $where .= ' AND (fullname LIKE ? OR email LIKE ? OR purpose LIKE ?)';
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        $sql = "SELECT a.*, u.fullname, u.email, u.phone 
                FROM appointments a 
                JOIN users u ON a.user_id = u.id 
                $where 
                ORDER BY a.appointment_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();
        $filename = 'appointments_report';
        break;

    case 'users':
        $role = $_GET['role'] ?? '';
        if ($role !== '') {
            $where .= ' AND role = ?';
            $params[] = $role;
        }
        if ($search !== '') {
            $where .= ' AND (fullname LIKE ? OR email LIKE ? OR phone LIKE ?)';
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        $sql = "SELECT id, fullname, email, phone, address, role, created_at 
                FROM users 
                $where 
                ORDER BY created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();
        $filename = 'users_report';
        break;

    case 'records':
        $service = $_GET['service'] ?? '';
        if ($service !== '') {
            $where .= ' AND service_type LIKE ?';
            $params[] = '%' . $service . '%';
        }
        if ($search !== '') {
            $where .= ' AND (details LIKE ? OR service_type LIKE ?)';
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
        }
        $sql = "SELECT pr.*, u.fullname AS parishioner_name 
                FROM parish_records pr 
                LEFT JOIN users u ON pr.user_id = u.id 
                $where 
                ORDER BY pr.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();
        $filename = 'records_report';
        break;

    case 'notifications':
        $type = $_GET['type'] ?? '';
        if ($type !== '') {
            $where .= ' AND type = ?';
            $params[] = $type;
        }
        if ($search !== '') {
            $where .= ' AND (title LIKE ? OR message LIKE ?)';
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
        }
        $sql = "SELECT n.*, u.fullname AS user_name 
                FROM notifications n 
                JOIN users u ON n.user_id = u.id 
                $where 
                ORDER BY n.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll();
        $filename = 'notifications_report';
        break;

    default:
        // Combined report - summary stats
        $data = [
            'summary' => [
                'total_parishioners' => (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn(),
                'total_users' => (int) $db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
                'pending_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status IN ('Pending', 'Under Review')")->fetchColumn(),
                'approved_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Approved'")->fetchColumn(),
                'rejected_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Rejected'")->fetchColumn(),
                'completed_reservations' => (int) $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'Completed'")->fetchColumn(),
                'pending_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Pending'")->fetchColumn(),
                'approved_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Approved'")->fetchColumn(),
                'completed_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Completed'")->fetchColumn(),
                'cancelled_appointments' => (int) $db->query("SELECT COUNT(*) FROM appointments WHERE status = 'Cancelled'")->fetchColumn(),
                'total_records' => (int) $db->query('SELECT COUNT(*) FROM parish_records')->fetchColumn(),
            ],
        ];
        $filename = 'summary_report';
        break;
}

switch ($format) {
    case 'csv':
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '_' . date('Y-m-d') . '.csv"');
        
        $output = fopen('php://output', 'w');
        
        if (empty($data)) {
            fputcsv($output, ['No data available']);
        } elseif ($category === 'all') {
            fputcsv($output, ['Metric', 'Value']);
            foreach ($data['summary'] as $key => $value) {
                fputcsv($output, [$key, $value]);
            }
        } else {
            if (!empty($data)) {
                fputcsv($output, array_keys($data[0]));
                foreach ($data as $row) {
                    fputcsv($output, $row);
                }
            }
        }
        
        fclose($output);
        break;

    case 'excel':
        // Recommend PhpSpreadsheet for Excel export
        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '_' . date('Y-m-d') . '.xls"');
        
        $output = fopen('php://output', 'w');
        
        if (empty($data)) {
            fwrite($output, "No data available\n");
        } elseif ($category === 'all') {
            fwrite($output, "Metric\tValue\n");
            foreach ($data['summary'] as $key => $value) {
                fwrite($output, "$key\t$value\n");
            }
        } else {
            if (!empty($data)) {
                fwrite($output, implode("\t", array_keys($data[0])) . "\n");
                foreach ($data as $row) {
                    fwrite($output, implode("\t", $row) . "\n");
                }
            }
        }
        
        fclose($output);
        break;

    case 'pdf':
        // Recommend TCPDF for PDF export
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '_' . date('Y-m-d') . '.pdf"');
        
        echo "PDF export requires TCPDF library. Install with: composer require tecnickcom/tcpdf\n";
        echo "Report data would be rendered here with TCPDF\n";
        echo "Category: $category\n";
        echo "Period: $period\n";
        echo "Total records: " . (is_array($data) ? count($data) : 1) . "\n";
        break;

    default:
        http_response_code(400);
        exit('Invalid format. Use csv, excel, or pdf.');
}
