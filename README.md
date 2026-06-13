# Focus Pro

> **Trải nghiệm xem video Facebook/Reels như rạp chiếu phim ngay trên trình duyệt** — với giao diện điều khiển hiện đại, tự ẩn thông minh và nhiều tính năng chuyên nghiệp.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com) 
[![Version](https://img.shields.io/badge/version-1.4.0-blue)](https://github.com/longthree1/Focus-Pro)

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
| `Alt + Z` / `Alt + V` | Focus (đầy màn / vừa màn)         |
| `Alt + F`         | Fullscreen thật (không có UI trình duyệt) |
| `Alt + X`         | Thoát Focus mode                   |
| `Alt + A`         | Bật/Tắt Khóa âm                    |
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
4. Nhấn **Load unpacked** → chọn thư mục `fb-reel-focus-pro`

### Cách 2: Cài từ Chrome Web Store (sắp có)

(Đang chuẩn bị publish)


## 🛠️ Công nghệ sử dụng

- Vanilla JavaScript (không framework)
- Chrome Extension Manifest V3
- Modern CSS + Glassmorphism UI
- MutationObserver + smart event handling

## 📝 Lịch sử cập nhật

### v1.4.0 (Current)
- Sửa lỗi controls không tự ẩn khi để yên chuột
- Cải thiện Audio Lock mạnh hơn, sửa race condition
- Thêm video removal observer
- Tối ưu hiệu năng và trải nghiệm người dùng

## 📜 License

MIT License

---

**Made with ❤️ for people who love watching Reels & Videos without distraction.**
