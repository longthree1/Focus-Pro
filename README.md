# Focus Pro

> **Trải nghiệm xem video Facebook/Reels như rạp chiếu phim ngay trên trình duyệt** — với giao diện điều khiển hiện đại, tự ẩn thông minh và nhiều tính năng chuyên nghiệp.

[![Version](https://img.shields.io/badge/version-1.5.0-blue)](https://github.com/longthree1/Focus-Pro)

## ✨ Tính năng nổi bật

- **Focus Mode toàn màn hình** cực mượt với hiệu ứng glassmorphism hiện đại
- **Điều khiển tự ẩn thông minh** (ẩn sau 3 giây khi không di chuyển chuột)
- **Khóa âm thanh (Audio Lock)** — không bị Facebook tự động tắt tiếng
- **Zoom linh hoạt** + 2 chế độ hiển thị: Contain / Cover
- **Phím tắt cực mạnh** (xem bên dưới)
- **Hỗ trợ Google Meet**: Tự động phóng to màn hình chính, ẩn chat, reaction, tay giơ…
- **Hỗ trợ TikTok Live**: Ẩn hoàn toàn quà tặng bay, thông báo tặng quà, nút nạp xu…

## ⌨️ Phím tắt

| Phím tắt          | Chức năng                          |
|-------------------|------------------------------------|
| `Alt + Z`         | Focus (vừa màn FB) / Bật Focus Meet / Bật Clean Gifts (TikTok) |
| `Alt + V`         | Focus Cover (phóng đầy, crop - chỉ FB) |
| `Alt + F`         | Fullscreen thật (không có UI trình duyệt) |
| `Alt + X`         | Thoát Focus / Tắt chế độ (cả FB, Meet, TikTok) |
| `Space`           | Play / Pause                       |
| `←` `→`           | Tua nhanh 5 giây                   |
| `↑` `↓`           | Tăng / Giảm âm lượng               |
| `+` `-`           | Zoom in / Zoom out                 |
| `0`               | Reset zoom về 100%                 |
| `M`               | Tắt/Bật tiếng thủ công             |

## 📦 Cài đặt

### Cách 1: Load unpacked (dành cho developer)

1. Tải về và giải nén file zip
2. Mở `chrome://extensions`
3. Bật **Developer mode**
4. Nhấn **Load unpacked** → chọn thư mục `focus-pro`

### Cách 2: Cài từ Chrome Web Store (sắp có)

(Đang chuẩn bị publish)


## 🛠️ Công nghệ sử dụng

- Vanilla JavaScript (không framework)
- Chrome Extension Manifest V3
- Modern CSS + Glassmorphism UI
- MutationObserver + smart event handling

## 📝 Lịch sử cập nhật

### v1.5.0 (Current)
- Bổ sung phím tắt đồng nhất trên các nền tảng (Alt+Z / Alt+X)
- Sửa lỗi xung đột phím tắt khi gõ văn bản (Typing guard cho TikTok/Meet)
- Khắc phục triệt để lỗi rò rỉ Message Port ("Message port closed") trên toàn bộ extension
- Sửa lỗi icon bị vuông ô (□) trên Popup
- Bổ sung thực thi phím Alt+S để đổi tốc độ phát như thiết kế ban đầu
- Cải thiện Meet/TikTok scanning bằng MutationObserver để tối ưu hiệu năng
- Cải thiện Audio Lock, sửa lỗi UI cập nhật trạng thái

### v1.4.0 
- Sửa lỗi controls không tự ẩn khi để yên chuột
- Cải thiện Audio Lock mạnh hơn, sửa race condition
- Thêm video removal observer
- Tối ưu hiệu năng và trải nghiệm người dùng


**Made with ❤️ for people who love watching Reels & Videos without distraction.**
