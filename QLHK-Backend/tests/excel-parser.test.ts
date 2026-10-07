import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { normalizeDob, parseNhanHoKhauExcel } from '../src/utils/excelParser';
import { config } from '../src/config/env';
import ExcelJS from 'exceljs';

describe('Bộ bóc tách Excel thông minh (Excel Parser Engine)', () => {
  describe('Chuẩn hóa ngày sinh (normalizeDob)', () => {
    it('phải chuyển đổi số serial Excel thành định dạng DD/MM/YYYY chuẩn', () => {
      // 37121 trong Excel là 18/08/2001
      const res = normalizeDob(37121);
      expect(res.dob).toBe('18/08/2001');
      expect(res.warning).toBeUndefined();
    });

    it('phải tự động chuẩn hóa năm sinh 3 chữ số: 11/01/976 -> 11/01/1976', () => {
      const res = normalizeDob('11/01/976');
      expect(res.dob).toBe('11/01/1976');
      expect(res.warning).toBeUndefined();
    });

    it('phải phát hiện ngày sinh không hợp lệ kèm cờ cảnh báo: 15/17/1989 (Tháng 17)', () => {
      const res = normalizeDob('15/17/1989');
      expect(res.dob).toBe('15/17/1989');
      expect(res.warning).toBeDefined();
      expect(res.warning).toContain('không hợp lệ');
    });

    it('phải chấp nhận chuỗi chỉ có năm sinh hợp lệ (ví dụ: 1980)', () => {
      const res = normalizeDob('1980');
      expect(res.dob).toBe('1980');
      expect(res.warning).toBeUndefined();
    });

    it('phải xử lý chính xác đối tượng JavaScript Date', () => {
      const d = new Date(Date.UTC(2001, 7, 18));
      const res = normalizeDob(d);
      expect(res.dob).toBe('18/08/2001');
      expect(res.warning).toBeUndefined();
    });

    it('phải xử lý chính xác chuỗi ISO YYYY-MM-DD và khoảng trắng', () => {
      expect(normalizeDob('2001-08-18').dob).toBe('18/08/2001');
      expect(normalizeDob('2001/08/18').dob).toBe('18/08/2001');
      expect(normalizeDob(' 18 / 08 / 2001 ').dob).toBe('18/08/2001');
    });
  });

  describe('Bóc tách file thực tế: C:\\Users\\umnuar\\Downloads\\Nhân hộ khẩu.xls', () => {
    const filePath = config.excelSamplePath;

    it('file mẫu của Xã Đăk Hà phải tồn tại', () => {
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('phải bóc tách chuẩn xác 4 hộ gia đình và 14 nhân khẩu', async () => {
      const result = await parseNhanHoKhauExcel(filePath);

      expect(result.sheet_name).toBe('Dl Hộ');
      expect(result.total_households).toBe(4);
      expect(result.total_citizens).toBe(14);
      expect(result.households.length).toBe(4);

      // Hộ 1: Chủ hộ NGUYỄN VĂN A, 3 thành viên
      const h1 = result.households[0];
      expect(h1.head_name).toBe('NGUYỄN VĂN A');
      expect(h1.member_count).toBe(3);
      expect(h1.members[0].is_head).toBe(true);
      expect(h1.members[0].relationship).toBe('Chủ hộ');
      expect(h1.members[1].relationship).toBe('Thành viên');
      expect(h1.members[2].relationship).toBe('Thành viên');
      expect(h1.members[0].gender).toBe('Nữ'); // Cột Nữ có 'X'
      expect(h1.members[0].ethnicity).toBe('Cor');

      // Hộ 2: Chủ hộ NGUYỄN VĂN B, 4 thành viên
      const h2 = result.households[1];
      expect(h2.head_name).toBe('NGUYỄN VĂN B');
      expect(h2.member_count).toBe(4);
      // Kiểm tra thành viên có năm 3 chữ số 976 -> 1976
      const citizen976 = h2.members.find((m) => m.full_name === 'NGUYỄN VĂN A' && m.stt === 5);
      expect(citizen976).toBeDefined();
      expect(citizen976?.dob).toBe('11/01/1976');

      // Hộ 3: Chủ hộ ĐINH THANH HIỂU, 3 thành viên
      const h3 = result.households[2];
      expect(h3.head_name).toBe('ĐINH THANH HIỂU');
      expect(h3.member_count).toBe(3);
      expect(h3.members[0].religion).toBe('Công giáo');
      // Kiểm tra thành viên TRẦN VĂN BẢO có ngày sinh 15/12/1989
      const citizenBao = h3.members.find((m) => m.full_name === 'TRẦN VĂN BẢO');
      expect(citizenBao).toBeDefined();
      expect(citizenBao?.dob).toBe('15/12/1989');

      // Hộ 4: Chủ hộ TRƯƠNG VĂN THÀNH, 4 thành viên
      const h4 = result.households[3];
      expect(h4.head_name).toBe('TRƯƠNG VĂN THÀNH');
      expect(h4.member_count).toBe(4);
    });

    it('danh sách warnings và errors phải là mảng chuẩn', async () => {
      const result = await parseNhanHoKhauExcel(filePath);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('phải ghi nhận đầy đủ 14 dân tộc khác nhau trong file mẫu', async () => {
      const result = await parseNhanHoKhauExcel(filePath);
      const allCitizens = result.households.flatMap((h) => h.members);
      const uniqueEthnicities = new Set(allCitizens.map((c) => c.ethnicity));

      expect(uniqueEthnicities.size).toBe(14);
      expect(uniqueEthnicities.has('Cor')).toBe(true);
      expect(uniqueEthnicities.has('Cơ Ho')).toBe(true);
      expect(uniqueEthnicities.has('Dao')).toBe(true);
      expect(uniqueEthnicities.has('Dìu')).toBe(true);
      expect(uniqueEthnicities.has('Ê Đê')).toBe(true);
      expect(uniqueEthnicities.has('Gia Rai')).toBe(true);
      expect(uniqueEthnicities.has('Xơ Đăng')).toBe(true);
      expect(uniqueEthnicities.has('Giẻ Triêng')).toBe(true);
      expect(uniqueEthnicities.has('Giơ Lâng')).toBe(true);
      expect(uniqueEthnicities.has('Ha Lăng')).toBe(true);
      expect(uniqueEthnicities.has('Hoa')).toBe(true);
      expect(uniqueEthnicities.has('Hrê')).toBe(true);
      expect(uniqueEthnicities.has('Khách Gia')).toBe(true);
      expect(uniqueEthnicities.has('Kinh')).toBe(true);
    });
  });

  describe('Bóc tách mẫu 11 cột tiêu chuẩn qua luồng ExcelJS (Buffer & Stream)', () => {
    it('phải bóc tách chính xác biểu mẫu 11 cột phẳng tiêu chuẩn từ Buffer/Stream', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Mau11Cot');
      // Thêm header 11 cột
      sheet.addRow([
        'STT',
        'Mã hộ khẩu',
        'Họ và tên',
        'Quan hệ',
        'Ngày sinh',
        'Giới tính',
        'Dân tộc',
        'Tôn giáo',
        'Số CCCD',
        'Địa chỉ thường trú',
        'Ghi chú',
      ]);
      // Thêm dữ liệu 2 hộ gia đình
      sheet.addRow([1, 'HK-1001', 'A Thui', 'Chủ hộ', '1985', 'Nam', 'Xơ Đăng', 'Không', '064085000123', 'Thôn 1, Đăk Hà', 'Chính sách']);
      sheet.addRow([2, 'HK-1001', 'Y Mới', 'Vợ', '1988', 'Nữ', 'Xơ Đăng', 'Không', '064088000456', 'Thôn 1, Đăk Hà', '']);
      sheet.addRow([3, 'HK-1002', 'Nguyễn Thị Hoa', 'Chủ hộ', '1992', 'Nữ', 'Kinh', 'Công giáo', '064092000789', 'Thôn 2, Đăk Hà', '']);

      const buffer = await workbook.xlsx.writeBuffer();
      const parsed = await parseNhanHoKhauExcel(Buffer.from(buffer));

      expect(parsed.total_households).toBe(2);
      expect(parsed.total_citizens).toBe(3);
      expect(parsed.households[0].head_name).toBe('A Thui');
      expect(parsed.households[0].members.length).toBe(2);
      expect(parsed.households[0].members[0].cccd).toBe('064085000123');
      expect(parsed.households[1].head_name).toBe('Nguyễn Thị Hoa');
      expect(parsed.households[1].members[0].ethnicity).toBe('Kinh');
    });
  });
});
