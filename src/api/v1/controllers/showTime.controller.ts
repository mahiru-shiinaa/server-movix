import { Request, Response } from "express";
import ShowTime from "../models/showTime.model";
import Room from "../models/room.model";
import Film from "../models/film.model";
import Cinema from "../models/cinema.model";
import { IShowTimeCreate, IShowTimeUpdate, ShowTimeSeatStatus } from "../../../types/showTime.type";
import { CommonStatus } from "../../../types/common.type";
import { UserRole } from "../../../types/user.type";

/**
 * Kiểm tra xung đột thời gian giữa các suất chiếu trong cùng phòng
 */
const checkTimeConflict = async (
  roomId: string,
  startTime: Date,
  endTime: Date,
  excludeShowTimeId?: string
): Promise<boolean> => {
  const query: any = {
    roomId,
    deleted: false,
    $or: [
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
    ],
  };

  if (excludeShowTimeId) {
    query._id = { $ne: excludeShowTimeId };
  }

  const conflictingShowTime = await ShowTime.findOne(query);
  return !!conflictingShowTime;
};

/**
 * ✅ Kiểm tra xem suất chiếu có ghế nào đang bị BOOKED hay không
 */
const hasBookedSeats = (seats: any[]): boolean => {
  return seats.some(seat => seat.status === ShowTimeSeatStatus.BOOKED);
};


// [GET] LIST SHOWTIME
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user && req.user.role === UserRole.ADMIN;

    // Pagination params
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query: any = { deleted: false };

    // Filter by status
    if (req.query.status) {
      // Validate status value
      if (Object.values(CommonStatus).includes(req.query.status as CommonStatus)) {
        query.status = req.query.status;
      }
    } else if (!isAdmin) {
      // Non-admin users only see active showtimes
      query.status = CommonStatus.ACTIVE;
    }

    // Filter by filmId
    if (req.query.filmId) query.filmId = req.query.filmId;
    
    // Filter by cinemaId
    if (req.query.cinemaId) query.cinemaId = req.query.cinemaId;
    
    // Filter by roomId
    if (req.query.roomId) query.roomId = req.query.roomId;

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.startTime = {};
      if (req.query.startDate) {
        query.startTime.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        query.startTime.$lte = new Date(req.query.endDate as string);
      }
    }

    // Get total count for pagination
    const total = await ShowTime.countDocuments(query);

    // Get paginated data
    const showtimes = await ShowTime.find(query)
      .populate({ path: "filmId", select: "title" })
      .populate({ path: "cinemaId", select: "name address" })
      .populate({ path: "roomId", select: "name" })
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      code: 200,
      message: "Thành công",
      data: showtimes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get showtimes error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] DETAIL BY ID
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isAdmin = req.user && req.user.role === UserRole.ADMIN;

    let query: any = { _id: id, deleted: false };

    if (!isAdmin) {
      query.status = CommonStatus.ACTIVE;
    }

    const showtime = await ShowTime.findOne(query)
      .populate({ path: "filmId", select: "title thumbnail duration description actors directors ageRating" })
      .populate({ path: "cinemaId", select: "name address avatar" })
      .populate({ path: "roomId", select: "name supportedFormats" });

    if (!showtime) {
      res.status(404).json({ message: "Không tìm thấy suất chiếu" });
      return;
    }

    res.status(200).json({
      code: 200,
      message: "Thành công",
      data: showtime,
    });
  } catch (error) {
    console.error("Get showtime error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [POST] CREATE SHOWTIME
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const createData = req.body as IShowTimeCreate;

    // 1. Kiểm tra phòng chiếu có tồn tại không
    const room = await Room.findOne({
      _id: createData.roomId,
      deleted: false,
    });

    if (!room) {
      res.status(404).json({ message: "Không tìm thấy phòng chiếu" });
      return;
    }

    // ✅ 2. KIỂM TRA cinemaId PHẢI KHỚP với cinema của room
    if (createData.cinemaId.toString() !== room.cinemaId.toString()) {
      res.status(400).json({
        code: 400,
        message: "Rạp chiếu không khớp với rạp chứa phòng này",
      });
      return;
    }

    // 3. Kiểm tra phim có tồn tại không
    const film = await Film.findOne({
      _id: createData.filmId,
      deleted: false,
    });

    if (!film) {
      res.status(404).json({ message: "Không tìm thấy phim" });
      return;
    }

    // 4. Kiểm tra rạp có tồn tại không (optional, vì đã kiểm tra qua room)
    const cinema = await Cinema.findOne({
      _id: createData.cinemaId,
      deleted: false,
    });

    if (!cinema) {
      res.status(404).json({ message: "Không tìm thấy rạp chiếu" });
      return;
    }

    //  5. Kiểm tra format có được hỗ trợ bởi PHIM không
    if (!film.availableFormats.includes(createData.format)) {
      res.status(400).json({
        code: 400,
        message: `Phim "${film.title}" không hỗ trợ định dạng ${createData.format}. Các định dạng khả dụng: ${film.availableFormats.join(", ")}`,
      });
      return;
    }

    //  6. Kiểm tra format có được hỗ trợ bởi PHÒNG không
    if (!room.supportedFormats.includes(createData.format)) {
      res.status(400).json({
        code: 400,
        message: `Phòng ${room.name} không hỗ trợ định dạng ${createData.format}. Các định dạng khả dụng: ${room.supportedFormats.join(", ")}`,
      });
      return;
    }

    // 7. Kiểm tra xung đột thời gian
    const hasConflict = await checkTimeConflict(
      createData.roomId.toString(),
      createData.startTime,
      createData.endTime
    );

    if (hasConflict) {
      res.status(400).json({
        message: "Khoảng thời gian này bị trùng với suất chiếu khác trong cùng phòng",
      });
      return;
    }

    // 8. Snapshot seatLayout từ room và thêm status
    const seats = room.seatLayout.map((seat) => ({
      row: seat.row,
      number: seat.number,
      type: seat.type,
      seatKey: seat.seatKey,
      partnerSeatKey: seat.partnerSeatKey,
      status: ShowTimeSeatStatus.AVAILABLE,
    }));

    // 9. Tạo showtime với seats đã snapshot
    const showtime = await ShowTime.create({
      ...createData,
      seats,
    });

    res.status(201).json({
      code: 201,
      message: "Tạo suất chiếu thành công",
      data: showtime,
    });
  } catch (error) {
    console.error("Create showtime error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ✅ [PATCH] EDIT SHOWTIME - CHỈ CHO PHÉP SỬA MỘT SỐ TRƯỜNG
export const edit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as IShowTimeUpdate;

    // 1. Kiểm tra showtime có tồn tại không
    const currentShowtime = await ShowTime.findOne({
      _id: id,
      deleted: false,
    });

    if (!currentShowtime) {
      res.status(404).json({ message: "Không tìm thấy suất chiếu" });
      return;
    }

    // ✅ 2. KIỂM TRA CÓ GHẾ NÀO ĐÃ BOOKED HAY KHÔNG
    if (hasBookedSeats(currentShowtime.seats)) {
      res.status(400).json({
        code: 400,
        message: "Không thể sửa suất chiếu đã có người đặt vé",
      });
      return;
    }

    // ✅ 3. Nếu update format, kiểm tra format có được hỗ trợ không
    if (updateData.format) {
      // Kiểm tra phim có hỗ trợ format này không
      const film = await Film.findOne({
        _id: currentShowtime.filmId,
        deleted: false,
      });

      if (!film) {
        res.status(404).json({ message: "Không tìm thấy phim" });
        return;
      }

      if (!film.availableFormats.includes(updateData.format)) {
        res.status(400).json({
          code: 400,
          message: `Phim "${film.title}" không hỗ trợ định dạng ${updateData.format}. Các định dạng khả dụng: ${film.availableFormats.join(", ")}`,
        });
        return;
      }

      // Kiểm tra phòng có hỗ trợ format này không
      const room = await Room.findOne({
        _id: currentShowtime.roomId,
        deleted: false,
      });

      if (!room) {
        res.status(404).json({ message: "Không tìm thấy phòng chiếu" });
        return;
      }

      if (!room.supportedFormats.includes(updateData.format)) {
        res.status(400).json({
          code: 400,
          message: `Phòng ${room.name} không hỗ trợ định dạng ${updateData.format}. Các định dạng khả dụng: ${room.supportedFormats.join(", ")}`,
        });
        return;
      }
    }

    // ✅ 4. Nếu update thời gian, kiểm tra xung đột
    if (updateData.startTime || updateData.endTime) {
      const checkStartTime = updateData.startTime || currentShowtime.startTime;
      const checkEndTime = updateData.endTime || currentShowtime.endTime;

      const hasConflict = await checkTimeConflict(
        currentShowtime.roomId.toString(),
        checkStartTime,
        checkEndTime,
        id
      );

      if (hasConflict) {
        res.status(400).json({
          message: "Khoảng thời gian này bị trùng với suất chiếu khác trong cùng phòng",
        });
        return;
      }
    }

    // ✅ 5. Update showtime (CHỈ CÁC TRƯỜNG ĐƯỢC PHÉP)
    const showtime = await ShowTime.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.status(200).json({
      code: 200,
      message: "Cập nhật suất chiếu thành công",
      data: showtime,
    });
  } catch (error) {
    console.error("Update showtime error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ✅ [DELETE] DELETE SHOWTIME - KIỂM TRA GHẾ BOOKED
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const showtime = await ShowTime.findById(id);

    if (!showtime) {
      res.status(404).json({ message: "Không tìm thấy suất chiếu" });
      return;
    }

    // ✅ Kiểm tra xem có ghế nào đã được đặt chưa
    if (hasBookedSeats(showtime.seats)) {
      res.status(400).json({
        code: 400,
        message: "Không thể xóa suất chiếu đã có người đặt vé",
      });
      return;
    }

    showtime.deleted = true;
    await showtime.save();

    res.status(200).json({
      code: 200,
      message: "Xóa suất chiếu thành công",
    });
  } catch (error) {
    console.error("Delete showtime error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};