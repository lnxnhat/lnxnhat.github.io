/**
 * LNXNhat System — Core Backup Engine (v2.1)
 * Chịu trách nhiệm: Quản lý bộ đệm cục bộ (LocalStorage) 
 * để hiển thị danh sách tức thì mà không cần load từ Google Sheets.
 */

// Đảm bảo không bị lỗi nếu biến bị xóa nhầm
if (typeof window.localDatabase === 'undefined') {
    window.localDatabase = [];
}

// 1. Khởi tạo dữ liệu từ bộ nhớ máy tính
function initBackupSystem() {
    try {
        const savedData = localStorage.getItem('lnxnhat_db_backup');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            // Kiểm tra và sửa lỗi nếu dữ liệu cũ bị thiếu các thuộc tính quan trọng
            window.localDatabase = Array.isArray(parsedData) ? parsedData.map(item => ({
                id: item.id || "0000",
                name: item.name || "Chưa rõ",
                class: item.class || "N/A",
                birth: item.birth || "",
                note: item.note || "Trống",
                sig: item.sig || ""
            })) : [];
        } else {
            window.localDatabase = [];
        }
    } catch (e) {
        console.error("Lỗi cấu trúc Backup, reset về trạng thái trống:", e);
        window.localDatabase = [];
    }
}

// 2. Lưu cập nhật xuống bộ nhớ máy tính
function syncBackup() {
    try {
        localStorage.setItem('lnxnhat_db_backup', JSON.stringify(window.localDatabase));
    } catch (e) {
        console.error("Lỗi khi lưu Backup vào trình duyệt:", e);
    }
}

// 3. Hàm thêm mới hồ sơ vào bộ đệm (Dùng cho Admin/Guest)
function addToLocalDatabase(newRecord) {
    // Kiểm tra trùng ID (nếu có)
    const existingIndex = window.localDatabase.findIndex(r => r.id === newRecord.id);
    if (existingIndex > -1) {
        window.localDatabase[existingIndex] = newRecord;
    } else {
        window.localDatabase.push(newRecord);
    }
    syncBackup();
}

// 4. Hàm xóa hồ sơ khỏi bộ đệm
function removeFromLocalDatabase(id) {
    window.localDatabase = window.localDatabase.filter(r => r.id !== id);
    syncBackup();
}

// Tự động khởi chạy khi trang web vừa tải xong
initBackupSystem();
