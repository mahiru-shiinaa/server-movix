import { Request, Response, NextFunction } from "express";
import { CommonStatus } from "../../../types/common.type";
import { SeatType } from "../../../types/room.type";

// Kiểm tra ObjectId hợp lệ
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Validate tạo mới room
export const validateCreateRoom = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const {
      cinemaId,
      name,
      seatLayout,
      supportedFormats,
      status
    } = req.body;

    // Validate cinemaId
    if (!cinemaId || !isValidObjectId(cinemaId)) {
      res.status(400).json({ 
        code: 400, 
        message: "ID rạp chiếu không hợp lệ" 
      });
      return;
    }

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ 
        code: 400, 
        message: "Tên phòng chiếu không được để trống" 
      });
      return;
    }

    if (name.trim().length < 2) {
      res.status(400).json({ 
        code: 400, 
        message: "Tên phòng chiếu phải có ít nhất 2 ký tự" 
      });
      return;
    }

    if (name.trim().length > 50) {
      res.status(400).json({ 
        code: 400, 
        message: "Tên phòng chiếu không được vượt quá 50 ký tự" 
      });
      return;
    }

    // Validate seatLayout
    if (!seatLayout || !Array.isArray(seatLayout) || seatLayout.length === 0) {
      res.status(400).json({ 
        code: 400, 
        message: "Sơ đồ ghế không được để trống" 
      });
      return;
    }

    const seatKeys = new Set<string>();
    for (const seat of seatLayout) {
      // Validate row
      if (!seat.row || typeof seat.row !== 'string' || !seat.row.trim()) {
        res.status(400).json({ 
          code: 400, 
          message: "Hàng ghế không được để trống" 
        });
        return;
      }

      if (seat.row.trim().length > 3) {
        res.status(400).json({ 
          code: 400, 
          message: "Hàng ghế không được vượt quá 3 ký tự" 
        });
        return;
      }

      // Validate number
      if (!seat.number || typeof seat.number !== 'number' || seat.number <= 0) {
        res.status(400).json({ 
          code: 400, 
          message: "Số ghế phải là số dương" 
        });
        return;
      }

      if (seat.number > 50) {
        res.status(400).json({ 
          code: 400, 
          message: "Số ghế không được vượt quá 50" 
        });
        return;
      }

      // Validate type
      if (!seat.type || !Object.values(SeatType).includes(seat.type)) {
        res.status(400).json({ 
          code: 400, 
          message: `Loại ghế không hợp lệ. Chỉ chấp nhận: ${Object.values(SeatType).join(', ')}` 
        });
        return;
      }

      // Validate seatKey
      if (!seat.seatKey || typeof seat.seatKey !== 'string' || !seat.seatKey.trim()) {
        res.status(400).json({ 
          code: 400, 
          message: "Mã ghế không được để trống" 
        });
        return;
      }

      // Kiểm tra trùng lặp seatKey
      if (seatKeys.has(seat.seatKey)) {
        res.status(400).json({ 
          code: 400, 
          message: `Mã ghế ${seat.seatKey} bị trùng lặp` 
        });
        return;
      }
      seatKeys.add(seat.seatKey);

      // Validate seatKey format (should match row + number)
      const expectedSeatKey = seat.row.trim().toUpperCase() + seat.number;
      if (seat.seatKey !== expectedSeatKey) {
        res.status(400).json({ 
          code: 400, 
          message: `Mã ghế ${seat.seatKey} không khớp với hàng ${seat.row} và số ${seat.number}` 
        });
        return;
      }
    }

    // Validate supportedFormats
    if (!supportedFormats || !Array.isArray(supportedFormats) || supportedFormats.length === 0) {
      res.status(400).json({ 
        code: 400, 
        message: "Phòng phải hỗ trợ ít nhất một định dạng" 
      });
      return;
    }

    const validFormats = ['2D', '3D', 'IMAX', '4DX'];
    for (const format of supportedFormats) {
      if (!validFormats.includes(format)) {
        res.status(400).json({ 
          code: 400, 
          message: `Định dạng không hợp lệ. Chỉ chấp nhận: ${validFormats.join(', ')}` 
        });
        return;
      }
    }

    // Validate status (optional)
    if (status && !Object.values(CommonStatus).includes(status)) {
      res.status(400).json({ 
        code: 400, 
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${Object.values(CommonStatus).join(', ')}` 
      });
      return;
    }

    // Làm sạch dữ liệu
    req.body.name = name.trim();
    req.body.seatLayout = seatLayout.map((seat: any) => ({
      ...seat,
      row: seat.row.trim().toUpperCase(),
      seatKey: seat.row.trim().toUpperCase() + seat.number
    }));

    next();
  } catch (error) {
    console.error("Room validation error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Validate cập nhật room
export const validateUpdateRoom = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const body = { ...req.body };

    // Loại bỏ các trường không được phép sửa
    const forbiddenFields = ['createdAt', 'updatedAt'];
    forbiddenFields.forEach(field => delete body[field]);

    // Validate từng trường nếu có trong body
    if (body.cinemaId !== undefined) {
      if (!isValidObjectId(body.cinemaId)) {
        res.status(400).json({ 
          code: 400, 
          message: "ID rạp chiếu không hợp lệ" 
        });
        return;
      }
    }

    if (body.name !== undefined) {
      if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        res.status(400).json({ 
          code: 400, 
          message: "Tên phòng chiếu không được để trống" 
        });
        return;
      }
      
      if (body.name.trim().length < 2 || body.name.trim().length > 50) {
        res.status(400).json({ 
          code: 400, 
          message: "Tên phòng chiếu phải có từ 2 đến 50 ký tự" 
        });
        return;
      }
      body.name = body.name.trim();
    }

    if (body.seatLayout !== undefined) {
      if (!Array.isArray(body.seatLayout) || body.seatLayout.length === 0) {
        res.status(400).json({ 
          code: 400, 
          message: "Sơ đồ ghế không được để trống" 
        });
        return;
      }

      const seatKeys = new Set<string>();
      for (const seat of body.seatLayout) {
        // Validate seat structure
        if (!seat.row || typeof seat.row !== 'string' || !seat.row.trim()) {
          res.status(400).json({ 
            code: 400, 
            message: "Hàng ghế không được để trống" 
          });
          return;
        }

        if (!seat.number || typeof seat.number !== 'number' || seat.number <= 0) {
          res.status(400).json({ 
            code: 400, 
            message: "Số ghế phải là số dương" 
          });
          return;
        }

        if (!seat.type || !Object.values(SeatType).includes(seat.type)) {
          res.status(400).json({ 
            code: 400, 
            message: `Loại ghế không hợp lệ. Chỉ chấp nhận: ${Object.values(SeatType).join(', ')}` 
          });
          return;
        }

        if (!seat.seatKey || typeof seat.seatKey !== 'string' || !seat.seatKey.trim()) {
          res.status(400).json({ 
            code: 400, 
            message: "Mã ghế không được để trống" 
          });
          return;
        }

        // Kiểm tra trùng lặp
        if (seatKeys.has(seat.seatKey)) {
          res.status(400).json({ 
            code: 400, 
            message: `Mã ghế ${seat.seatKey} bị trùng lặp` 
          });
          return;
        }
        seatKeys.add(seat.seatKey);
      }

      body.seatLayout = body.seatLayout.map((seat: any) => ({
        ...seat,
        row: seat.row.trim().toUpperCase(),
        seatKey: seat.row.trim().toUpperCase() + seat.number
      }));
    }

    if (body.supportedFormats !== undefined) {
      if (!Array.isArray(body.supportedFormats) || body.supportedFormats.length === 0) {
        res.status(400).json({ 
          code: 400, 
          message: "Phòng phải hỗ trợ ít nhất một định dạng" 
        });
        return;
      }

      const validFormats = ['2D', '3D', 'IMAX', '4DX'];
      for (const format of body.supportedFormats) {
        if (!validFormats.includes(format)) {
          res.status(400).json({ 
            code: 400, 
            message: `Định dạng không hợp lệ. Chỉ chấp nhận: ${validFormats.join(', ')}` 
          });
          return;
        }
      }
    }

    if (body.status !== undefined && !Object.values(CommonStatus).includes(body.status)) {
      res.status(400).json({ 
        code: 400, 
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${Object.values(CommonStatus).join(', ')}` 
      });
      return;
    }

    // Gán lại body đã lọc vào req.body
    req.body = body;

    next();
  } catch (error) {
    console.error("Room update validation error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};