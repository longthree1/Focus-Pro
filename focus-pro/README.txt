Focus Pro v1.6.0

Cập nhật v1.6.0:
- Thêm tính năng "Mở trong Watch": Bấm Alt+W (hoặc biểu tượng ↗ trên thanh điều khiển) để mở Reel hiện tại sang giao diện Facebook Watch truyền thống ở Tab mới (dành cho ai muốn dùng player mặc định của FB).

Cập nhật v1.5.0:
- Nâng cấp Playback Speed: Hiển thị Popup Menu mượt mà để chọn tốc độ (0.5x - 2x).
- Tối ưu Audio Lock: Tự động chạy ngầm, luôn luôn giữ âm thanh gốc khi Facebook tự tắt tiếng (ẩn khỏi giao diện cho gọn).
- Sửa lỗi Alt+V chuyển sang chế độ "cover" thay vì duplicate "contain".
- Sửa lỗi toast messages hiển thị tên mới "Focus Mode".
- Bỏ auto-pause: video/audio tiếp tục chạy khi chuyển tab.
- Thêm isTypingTarget guard cho tất cả keyboard listeners (không can thiệp khi gõ text).
- Tối ưu TikTok: bỏ setInterval, chỉ dùng MutationObserver, thêm phím tắt bật/tắt (Alt+Z / Alt+X).
- Cập nhật Meet: tối ưu DOM scanning, thêm typing guard, thêm phím tắt bật/tắt (Alt+Z / Alt+X).
- Sửa lỗi icon extension và lỗi gửi nhầm lệnh tắt/bật từ Popup trên các trang khác nhau.
- Khắc phục lỗi rò rỉ message port trên toàn bộ extension.
- Hỗ trợ phím tắt Alt+S để đổi tốc độ phát video.

Phím tắt:
Alt+Z: Focus contain (vừa màn FB) / Bật Focus Meet / Bật Clean Gifts (TikTok)
Alt+V: Focus cover (phóng đầy, crop - FB)
Alt+X: Thoát Focus / Disable (cả FB, Meet, TikTok)
Alt+W: Mở Reel ở tab Facebook Watch (bằng phím tắt)
Alt+S: Chuyển nhanh tốc độ (1x ↔ 2x)
Space: Play/Pause
← / →: Tua 5 giây
+ / -: Zoom
M: Tắt/bật tiếng thủ công

Nút trên overlay (hiện khi hover):
- [C] contain · [V] cover · [−] [+] zoom · [1×] speed · [×] thoát

Nền tảng hỗ trợ:
- Facebook: Video Reels, Watch, posts
- Google Meet: Share screen focus, ẩn chat/participants
- TikTok: Live gift cleaning, video focus

Cài đặt:
1. Giải nén zip.
2. Mở chrome://extensions hoặc edge://extensions.
3. Bật Developer mode.
4. Load unpacked thư mục focus-pro.
