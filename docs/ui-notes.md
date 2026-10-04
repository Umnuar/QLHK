# UI Notes: Gỡ Bỏ Nhấn Mạnh & Tín Hiệu Thiếu CCCD

## 1. Bối cảnh
Theo quy định nghiệp vụ hiện tại, Căn cước công dân (CCCD) **KHÔNG bắt buộc** đối với công dân/nhân khẩu trong cơ sở dữ liệu. Do đó, toàn bộ giao diện đã được chuẩn hóa để loại bỏ mọi trạng thái cảnh báo, viền đỏ, nền đỏ hoặc thông báo thiếu dữ liệu CCCD.

## 2. Các Selector và Class đã gỡ bỏ

### 2.1. Cột Checkbox & Dòng Bảng Hộ Gia Đình (`HouseholdTable.tsx`)
- **Selector / Class đã gỡ bỏ**:
  - `border-l-[3px] border-l-rose-500` trên ô `<td>` checkbox sticky ở mép trái dòng.
  - State / Biến `isMissingCccd` (`!headCccd || headCccd === '—' || headCccd === '0' || headCccd.includes('chưa có')`).
- **Trạng thái mới**:
  - Ô sticky checkbox và dòng dữ liệu chỉ phản ánh 2 trạng thái: `isSelected` (xanh ngọc `emerald-50`) và bình thường (`bg-white` / `slate-900`), chuyển hover trung tính (`slate-50` / `slate-800/80`).

### 2.2. Màu nền bảng (`tableStyles.ts`)
- **Hàm `getTableRowBackground(isSelected)`**:
  - Đã loại bỏ tham số `isMissingCccd` và nhánh:
    ```typescript
    if (isMissingCccd) {
      return {
        rowClass: "bg-rose-50/70 dark:bg-rose-950/50 hover:bg-rose-100/70 dark:hover:bg-rose-900/60",
        stickyCellClass: "bg-rose-50/70 dark:bg-rose-950/50 group-hover:bg-rose-100/70 dark:group-hover:bg-rose-900/60"
      };
    }
    ```
  - Đồng bộ 100% màu nền giữa thẻ `<tr>` và ô cố định cột "Thao tác" `<td>` sticky ở mọi trạng thái.

### 2.3. Bảng con Nhân khẩu (`HouseholdTable.tsx`)
- **Hiển thị ô CCCD**:
  - Đã loại bỏ fallback chữ `"Chưa có"` và nút xem mắt khi không có CCCD.
  - Thay bằng dấu gạch ngang trung tính: `<span className="text-slate-400 dark:text-slate-500 font-normal select-none text-[13px]">—</span>`.

## 3. Khôi phục lại khi CCCD trở thành bắt buộc
Khi có yêu cầu nghiệp vụ bắt buộc CCCD trong tương lai:
1. Có thể sử dụng lệnh `git revert` đối với commit gỡ bỏ tương ứng trên nhánh `feat/household-table-redesign`.
2. Hoặc khôi phục lại tham số `isMissingCccd: boolean = false` trong `getTableRowBackground` tại `src/components/common/tableStyles.ts` và thêm lại class `border-l-[3px] border-l-rose-500` vào cột checkbox trong `src/components/households/HouseholdTable.tsx`.
