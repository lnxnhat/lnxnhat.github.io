// 1. DÁN URL BẠN VỪA COPY Ở BƯỚC TRÊN VÀO ĐÂY (Giữ nguyên dấu ngoặc kép)
const WEB_APP_URL = "https://script.google.com/macros/s/.../exec"; 

// 2. Hàm gửi dữ liệu lên Google Script
async function sendToDrive(payloadToSend) {
    try {
        console.log("Đang gửi dữ liệu...");
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            // Dùng text/plain để lách cửa bảo mật CORS của trình duyệt
            headers: {
                "Content-Type": "text/plain;charset=utf-8" 
            },
            body: JSON.stringify(payloadToSend)
        });
        
        const result = await response.json();
        console.log("Kết quả từ server:", result);
        alert("Đã lưu dữ liệu thành công!");
        
    } catch (e) {
        console.error("Lỗi khi gửi dữ liệu:", e);
        
        // Phương án dự phòng (Fallback) nếu vẫn bị kẹt
        fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payloadToSend)
        }).then(() => {
            console.log("Đã ép gửi xong bằng chế độ no-cors!");
        }).catch(err => console.error("Lỗi nặng:", err));
    }
}

// 3. Hàm kích hoạt khi bạn bấm nút LƯU trên web (Fix lỗi "payload is not defined")
function handleAdminSubmit() {
    // Gom dữ liệu từ các ô nhập liệu trên web (Sửa lại id lấy element cho khớp với web của bạn)
    // Ví dụ: document.getElementById('tuoi').value...
    const dataHoso = {
        id: "ID_Cua_Ban",         
        name: "Tên_Của_Bạn",       
        class: "Lớp_Của_Bạn",      
        birth: "Ngày_Sinh",
        note: "Ghi_chú",
        sig: "Chữ_ký",
        status: "Trạng_thái"
    };

    // Truyền biến dataHoso vào hàm gửi (Đây là cách sửa lỗi payload is not defined)
    sendToDrive(dataHoso);
}
