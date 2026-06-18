Focus Pro v1.5.0

Cập nhật v1.5.0:
- Thêm Playback Speed: chuột phải vào nút Speed để cycle 0.5x → 0.75x → 1x → 1.25x → 1.5x → 1.75x → 2x.
- Thêm Audio Lock: giữ âm thanh gốc khi mute video (Alt+A).
- Sửa lỗi Alt+V giờ chuyển sang chế độ "cover" thay vì duplicate "contain".
- Sửa lỗi Audio Lock UI cập nhật trạng thái trên overlay.
- Sửa lỗi toast messages hiển thị tên mới "Focus Mode".
- Bỏ auto-pause: video/audio tiếp tục chạy khi chuyển tab.
- Thêm isTypingTarget guard cho tất cả keyboard listeners (không can thiệp khi gõ text).
- Tối ưu TikTok: bỏ setInterval, chỉ dùng MutationObserver, thêm phím tắt bật/tắt (Alt+Z / Alt+X).
- Cập nhật Meet: tối ưu DOM scanning, thêm typing guard, thêm phím tắt bật/tắt (Alt+Z / Alt+X).
- Sửa lỗi icon extension và lỗi gửi nhầm lệnh tắt/bật từ Popup trên các trang khác nhau.
- Khắc phục lỗi rò rỉ message port trên toàn bộ extension.

Phím tắt:
Alt+Z: Focus contain (vừa màn FB) / Bật Focus Meet / Bật Clean Gifts (TikTok)
Alt+V: Focus cover (phóng đầy, crop - FB)
Alt+X: Thoát Focus / Disable (cả FB, Meet, TikTok)
Alt+A: Bật/tắt Audio Lock
Alt+S: Cycle tốc độ phát
Space: Play/Pause
← / →: Tua 5 giây
+ / -: Zoom
M: Tắt/bật tiếng thủ công

Nút trên overlay (hiện khi hover):
- [C] contain · [V] cover · [−] [+] zoom · [🔊] audio lock · [1×] speed · [×] thoát

Nền tảng hỗ trợ:
- Facebook: Video Reels, Watch, posts
- Google Meet: Share screen focus, ẩn chat/participants
- TikTok: Live gift cleaning, video focus

Cài đặt:
1. Giải nén zip.
2. Mở chrome://extensions hoặc edge://extensions.
3. Bật Developer mode.
4. Load unpacked thư mục focus-pro.
