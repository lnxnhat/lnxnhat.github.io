/**
 * LNXNhat System — Core Backup Engine (v3.0 - Cloud Sync & Versioning)
 * Xử lý đồng bộ Drive, Versioning (Fix/Remove), và Hệ thống Tags.
 */

const WEB_APP_URL = "ĐIỀN_URL_APPS_SCRIPT_CỦA_BẠN_VÀO_ĐÂY";

// Khởi tạo các kho chứa dữ liệu
window.localDatabase = []; // Dữ liệu hồ sơ đã lọc (hiển thị)
window.rawDatabase = [];   // Dữ liệu gốc từ Sheet (để tính toán fix/remove)
window.tagsDatabase = [];  // Dữ liệu Tags (Mối quan hệ)

// 1. Hàm tạo ID ngẫu nhiên
function generateID(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 2. Load dữ liệu từ LocalStorage (để Web hiện lên ngay lập tức)
function initBackupSystem() {
    try {
        const savedData = localStorage.getItem('lnxnhat_db_backup');
        const savedTags = localStorage.getItem('lnxnhat_tags_backup');
        if (savedData) window.localDatabase = JSON.parse(savedData);
        if (savedTags) window.tagsDatabase = JSON.parse(savedTags);
    } catch (e) {
        console.error("Lỗi khởi tạo LocalStorage:", e);
    }
    // Sau khi load local, gọi hàm đồng bộ ngầm từ Drive
    syncFromDrive();
}

// 3. Thuật toán xử lý Versioning (Lọc Fix cao nhất & Loại bỏ Remove)
function processRawData(rawRecords) {
    const grouped = {};
    // Nhóm các bản ghi theo ID
    rawRecords.forEach(row => {
        if (!grouped[row.id]) grouped[row.id] = [];
        grouped[row.id].push(row);
    });

    const activeRecords = [];
    for (const id in grouped) {
        const rows = grouped[id];
        let isRemoved = false;
        let maxFix = -1;
        let latestRow = null;

        rows.forEach(r => {
            const status = (r.status || "").toString();
            if (status.includes("remove")) {
                isRemoved = true; // Đã bị đánh dấu xóa
            } else if (status.startsWith("fix")) {
                const fixNum = parseInt(status.replace("fix", "")) || 0;
                if (fixNum > maxFix) {
                    maxFix = fixNum;
                    latestRow = r;
                }
            } else { // Bản ghi gốc (chưa có trạng thái)
                if (maxFix === -1) {
                    maxFix = 0;
                    latestRow = r;
                }
            }
        });

        // Nếu không bị xóa và có dữ liệu, đưa vào mảng hiển thị
        if (!isRemoved && latestRow) {
            activeRecords.push(latestRow);
        }
    }
    return activeRecords;
}

// 4. Đồng bộ 2 chiều (Kéo dữ liệu từ Sheet)
async function syncFromDrive() {
    if(!WEB_APP_URL || WEB_APP_URL === "ĐIỀN_URL_APPS_SCRIPT_CỦA_BẠN_VÀO_ĐÂY") return;
    
    try {
        const res = await fetch(WEB_APP_URL + "?action=getData");
        const data = await res.json();
        
        // Map dữ liệu mảng thành Object
        window.rawDatabase = data.records.slice(1).map(r => ({
            id: r[0], name: r[1], class: r[2], birth: r[3], note: r[4], sig: r[5], status: r[6] || "", relId: r[7] || ""
        }));
        window.tagsDatabase = data.tags.slice(1).map(r => ({
            tagId: r[0], tagName: r[1], tagColor: r[2]
        }));

        // Chạy thuật toán lọc
        window.localDatabase = processRawData(window.rawDatabase);

        // Lưu bản mới nhất xuống LocalStorage
        localStorage.setItem('lnxnhat_db_backup', JSON.stringify(window.localDatabase));
        localStorage.setItem('lnxnhat_tags_backup', JSON.stringify(window.tagsDatabase));

        // Kích hoạt Refresh UI nếu đang ở trang có danh sách
        if (typeof window.refreshUI === 'function') window.refreshUI();
        
    } catch (e) {
        console.error("Đang offline, dùng LocalStorage.", e);
    }
}

// 5. Đẩy dữ liệu lên Sheet (Lưu/Sửa/Xóa/Thêm Tag)
async function sendToDrive(payload) {
    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        // Tải lại dữ liệu sau khi push
        setTimeout(syncFromDrive, 1000); 
    } catch (e) {
        console.error("Lỗi khi gửi lên Drive:", e);
    }
}

// Tự động chạy
initBackupSystem();
