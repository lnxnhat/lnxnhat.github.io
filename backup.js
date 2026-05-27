import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

public class BackupSystem {

    // ================================================================
    //  ⚙️ ĐỊNH CẤU HÌNH ĐƯỜNG DẪN TRÊN MÁY TÍNH CỦA BẠN
    // ================================================================
    // Tải file Google Sheets xuống dạng .csv rồi sửa đường dẫn ở đây:
    private static final String CSV_FILE_PATH = "G:\\My Drive\\Chu_ki\\Danh sách phản hồi.csv";
    private static final String OUTPUT_DIR    = "G:\\My Drive\\Chu_ki"; // Nơi trích xuất cây thư mục ID
    // ================================================================

    public static void main(String[] args) {
        System.out.println("====================================================");
        System.out.println("🚀 BẮT ĐẦU QUÉT HỆ THỐNG PHÂN LOẠI FILE TỰ ĐỘNG (JAVA)...");
        System.out.println("====================================================");

        File csvFile = new File(CSV_FILE_PATH);
        if (!csvFile.exists()) {
            System.out.println("❌ Không tìm thấy tệp dữ liệu CSV tại: " + CSV_FILE_PATH);
            System.out.println("💡 Mẹo: Trên Google Sheets, chọn File -> Download -> Comma Separated Values (.csv)");
            System.out.println("   Sau đó đổi tên file tải về trùng với đường dẫn cấu hình ở trên là được!");
            return;
        }

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(new FileInputStream(csvFile), StandardCharsets.UTF_8))) {
            
            String line;
            boolean isHeader = true;

            while ((line = br.readLine()) != null) {
                // Bỏ qua dòng tiêu đề đầu tiên của file Excel CSV
                if (isHeader) {
                    isHeader = false;
                    continue;
                }

                // Phân tách các cột bằng hàm phân tích CSV cơ bản
                List<String> columns = parseCSVLine(line);
                if (columns.size() < 4) {
                    continue; // Bỏ qua dòng lỗi hoặc thiếu cột cốt lõi
                }

                String timestamp = columns.get(0); // Cột A: Dấu thời gian
                String recordId = safeIdString(columns.get(1)); // Cột B: Mã định danh ID sinh tự động
                String infoText = columns.get(2).trim(); // Cột C: Chuỗi "Tên - Lớp: ... (Ngày sinh)"
                String base64Image = columns.size() > 3 ? columns.get(3).trim() : ""; // Cột D: Chữ ký Base64 công khai

                if (recordId.isEmpty() || "0000".equals(recordId)) {
                    continue;
                }

                // Định nghĩa thư mục ID riêng biệt
                File idFolder = new File(OUTPUT_DIR, recordId);
                if (!idFolder.exists()) {
                    idFolder.mkdirs();
                }

                // Phân bóc dữ liệu từ cột thông tin tổng hợp
                String name = "Chưa rõ";
                String uClass = "N/A";
                String birthday = "Chưa cập nhật";

                try {
                    if (infoText.contains(" - Lớp: ")) {
                        String[] mainParts = infoText.split(" - Lớp: ");
                        name = mainParts[0].trim();
                        if (mainParts.length > 1 && mainParts[1].contains(" (")) {
                            String[] classParts = mainParts[1].split(" \\(");
                            uClass = classParts[0].trim();
                            birthday = classParts[1].replace(")", "").trim();
                            // Chuẩn hóa định dạng ngày sinh dd/mm/yyyy từ yyyy-mm-dd nếu cần
                            if (birthday.contains("-")) {
                                String[] dParts = birthday.split("-");
                                if (dParts.length == 3) {
                                    birthday = dParts[2] + "/" + dParts[1] + "/" + dParts[0];
                                }
                            }
                        }
                    } else {
                        name = infoText;
                    }
                } catch (Exception e) {
                    name = infoText; // Phòng ngừa chuỗi lỗi cấu trúc bóc tách
                }

                // TRƯỜNG HỢP 1: YÊU CẦU XÓA HỒ SƠ (Nếu chuỗi thông tin hoặc id chứa từ khóa REMOVE)
                if (infoText.toUpperCase().contains("REMOVE") || recordId.toUpperCase().contains("REMOVE")) {
                    File removeFile = new File(idFolder, "remove.txt");
                    if (!removeFile.exists()) {
                        String removeContent = "Hồ sơ ID " + recordId + " đã bị xóa trên hệ thống.\nThời gian xóa: " + timestamp + "\n";
                        writeFile(removeFile, removeContent);
                        System.out.println("🗑️ [ID: " + recordId + "] -> Đã tạo tệp đánh dấu xóa (remove.txt)");
                    }
                    continue;
                }

                // TRƯỜNG HỢP 2: LƯU MỚI HOẶC CẬP NHẬT HỒ SƠ
                File baseTxtFile = new File(idFolder, recordId + ".txt");
                String content = "=== THÔNG TIN HỒ SƠ ID: " + recordId + " ===\n"
                        + "Họ và Tên: " + name + "\n"
                        + "Ngày Sinh: " + birthday + "\n"
                        + "Đơn vị/Lớp: " + uClass + "\n"
                        + "Cập nhật hệ thống: " + timestamp + "\n";

                // Tạo file gốc nếu chưa từng tồn tại
                if (!baseTxtFile.exists()) {
                    writeFile(baseTxtFile, content);
                    if (!base64Image.isEmpty() && base64Image.startsWith("data:image")) {
                        saveSignatureImage(base64Image, new File(idFolder, recordId + ".jpeg"));
                    }
                    System.out.println("🆕 [ID: " + recordId + "] -> Đã khởi tạo hồ sơ gốc từ Google Sheets!");
                } else {
                    // Nếu file gốc đã tồn tại, kiểm tra trùng lặp qua dấu thời gian
                    String origContent = readFile(baseTxtFile);
                    if (origContent.contains("Cập nhật hệ thống: " + timestamp)) {
                        continue; 
                    }

                    // Quét số thứ tự file sửa đổi (fix1, fix2...) tránh đè dữ liệu cũ
                    int maxFixNum = 0;
                    File[] files = idFolder.listFiles();
                    if (files != null) {
                        for (File f : files) {
                            String fName = f.getName();
                            if (fName.endsWith(".txt") && fName.contains("fix")) {
                                try {
                                    String numStr = fName.substring(fName.indexOf("fix") + 3, fName.lastIndexOf(".txt"));
                                    int num = Integer.parseInt(numStr.trim());
                                    if (num > maxFixNum) {
                                        maxFixNum = num;
                                    }
                                } catch (Exception e) {}
                            }
                        }
                    }

                    // Kiểm tra lịch sử trùng lặp của các file bản vá (fix) cũ
                    boolean duplicateFix = false;
                    for (int i = 1; i <= maxFixNum; i++) {
                        File checkFile = new File(idFolder, recordId + " fix" + i + ".txt");
                        if (checkFile.exists() && readFile(checkFile).contains("Cập nhật hệ thống: " + timestamp)) {
                            duplicateFix = true;
                            break;
                        }
                    }
                    if (duplicateFix) {
                        continue;
                    }

                    // Ghi tệp sao lưu tăng tiến khi phát hiện thay đổi dữ liệu
                    int nextFix = maxFixNum + 1;
                    File fixTxtFile = new File(idFolder, recordId + " fix" + nextFix + ".txt");
                    writeFile(fixTxtFile, content);
                    
                    if (!base64Image.isEmpty() && base64Image.startsWith("data:image")) {
                        saveSignatureImage(base64Image, new File(idFolder, recordId + " fix" + nextFix + ".jpeg"));
                    }
                    System.out.println("🔧 [ID: " + recordId + "] -> Phát hiện bản ghi mới! Tạo file phân tách lịch sử: " + recordId + " fix" + nextFix + ".txt");
                }
            }

            System.out.println("\n====================================================");
            System.out.println("✅ HOÀN THÀNH QUY TRÌNH PHÂN LOẠI FILE CỤC BỘ!");
            System.out.println("====================================================");

        } catch (Exception e) {
            System.out.println("❌ Lỗi thực thi hệ thống Java: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // --- CÁC HÀM TIỆN ÍCH HỖ TRỢ XỬ LÝ CHUỖI VÀ TỆP TIN ---
    
    private static String safeIdString(String rawId) {
        if (rawId == null || rawId.trim().isEmpty()) return "";
        String val = rawId.trim().split("\\.")[0];
        try {
            int num = Integer.parseInt(val);
            return padLeft(String.valueOf(num), 4, '0');
        } catch (Exception e) {
            return val;
        }
    }

    private static String padLeft(String input, int length, char padChar) {
        StringBuilder sb = new StringBuilder(input.trim());
        while (sb.length() < length) {
            sb.insert(0, padChar);
        }
        return sb.toString();
    }

    private static void writeFile(File file, String content) throws Exception {
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static String readFile(File file) throws Exception {
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        }
    }

    private static void saveSignatureImage(String base64Str, File destFile) {
        try {
            if (!base64Str.contains(",")) return;
            String encoded = base64Str.split(",")[1];
            byte[] imgData = Base64.getDecoder().decode(encoded);
            try (FileOutputStream fos = new FileOutputStream(destFile)) {
                fos.write(imgData);
            }
        } catch (Exception e) {
            System.out.println("   ⚠️ Lỗi bóc tách lưu ảnh .jpeg chữ ký: " + e.getMessage());
        }
    }

    private static List<String> parseCSVLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder curVal = new StringBuilder();
        boolean inQuotes = false;
        char[] chars = line.toCharArray();
        for (char c : chars) {
            if (inQuotes) {
                if (c == '"') inQuotes = false;
                else curVal.append(c);
            } else {
                if (c == '"') inQuotes = true;
                else if (c == ',') {
                    result.add(curVal.toString());
                    curVal.setLength(0);
                } else curVal.append(c);
            }
        }
        result.add(curVal.toString());
        return result;
    }
}
