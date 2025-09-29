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
 * @param roomId - ID phòng chiếu
 * @param startTime - Thời gian bắt đầu
 * @param endTime - Thời gian kết thúc
 * @param excludeShowTimeId - ID suất chiếu cần loại trừ (dùng khi update)
 * @returns true nếu có xung đột, false nếu không
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
      // Trường hợp 1: Suất chiếu mới bắt đầu trong khoảng thời gian của suất cũ
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      // Trường hợp 2: Suất chiếu mới kết thúc trong khoảng thời gian của suất cũ
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      // Trường hợp 3: Suất chiếu mới bao trùm suất cũ
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
    ],
  };

  // Nếu đang update, loại trừ chính suất chiếu đó
  if (excludeShowTimeId) {
    query._id = { $ne: excludeShowTimeId };
  }

  const conflictingShowTime = await ShowTime.findOne(query);
  return !!conflictingShowTime;
};

// [GET] LIST SHOWTIME: /api/v1/showtimes
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user && req.user.role === UserRole.ADMIN;

    let query: any = { deleted: false };

    // Nếu không phải admin, chỉ hiển thị suất chiếu active
    if (!isAdmin) {
      query.status = CommonStatus.ACTIVE;
    }

    // Hỗ trợ filter theo filmId, cinemaId, roomId
    if (req.query.filmId) query.filmId = req.query.filmId;
    if (req.query.cinemaId) query.cinemaId = req.query.cinemaId;
    if (req.query.roomId) query.roomId = req.query.roomId;

    // Filter theo khoảng thời gian
    if (req.query.startDate || req.query.endDate) {
      query.startTime = {};
      if (req.query.startDate) {
        query.startTime.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        query.startTime.$lte = new Date(req.query.endDate as string);
      }
    }

    const showtimes = await ShowTime.find(query)
      .populate({ path: "filmId", select: "title thumbnail duration slug" })
      .populate({ path: "cinemaId", select: "name address" })
      .populate({ path: "roomId", select: "name" })
      .sort({ startTime: 1 });

    res.status(200).json({
      code: 200,
      message: "Thành công",
      data: showtimes,
    });
  } catch (error) {
    console.error("Get showtimes error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] DETAIL BY ID: /api/v1/showtimes/:id
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isAdmin = req.user && req.user.role === UserRole.ADMIN;

    let query: any = { _id: id, deleted: false };

    // Nếu không phải admin, chỉ xem được suất chiếu active
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

// [POST] CREATE SHOWTIME: /api/v1/showtimes
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

    // 2. Kiểm tra phim có tồn tại không
    const film = await Film.findOne({
      _id: createData.filmId,
      deleted: false,
    });

    if (!film) {
      res.status(404).json({ message: "Không tìm thấy phim" });
      return;
    }

    // 3. Kiểm tra rạp có tồn tại không
    const cinema = await Cinema.findOne({
      _id: createData.cinemaId,
      deleted: false,
    });

    if (!cinema) {
      res.status(404).json({ message: "Không tìm thấy rạp chiếu" });
      return;
    }

    // 4. Kiểm tra format có được hỗ trợ bởi phòng không
    if (!room.supportedFormats.includes(createData.format)) {
      res.status(400).json({
        message: `Phòng ${room.name} không hỗ trợ định dạng ${createData.format}`,
      });
      return;
    }

    // 5. Kiểm tra xung đột thời gian
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

    // 6. Snapshot seatLayout từ room và thêm status
    const seats = room.seatLayout.map((seat) => ({
      row: seat.row,
      number: seat.number,
      type: seat.type,
      seatKey: seat.seatKey,
      partnerSeatKey: seat.partnerSeatKey,
      status: ShowTimeSeatStatus.AVAILABLE, // ✅ Thêm status
    }));

    // 7. Tạo showtime với seats đã snapshot
    const showtime = await ShowTime.create({
      ...createData,
      seats, // ✅ Sử dụng seats đã snapshot
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

// [PATCH] EDIT SHOWTIME: /api/v1/showtimes/:id
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

    // 2. Nếu update roomId, kiểm tra phòng mới
    if (updateData.roomId) {
      const room = await Room.findOne({
        _id: updateData.roomId,
        deleted: false,
      });

      if (!room) {
        res.status(404).json({ message: "Không tìm thấy phòng chiếu" });
        return;
      }

      // Kiểm tra format có được hỗ trợ không
      const checkFormat = updateData.format || currentShowtime.format;
      if (!room.supportedFormats.includes(checkFormat)) {
        res.status(400).json({
          message: `Phòng ${room.name} không hỗ trợ định dạng ${checkFormat}`,
        });
        return;
      }

      // ✅ Snapshot lại seats từ phòng mới
      updateData.seats = room.seatLayout.map((seat) => ({
        row: seat.row,
        number: seat.number,
        type: seat.type,
        seatKey: seat.seatKey,
        partnerSeatKey: seat.partnerSeatKey,
        status: ShowTimeSeatStatus.AVAILABLE,
      }));
    }

    // 3. Nếu update filmId, kiểm tra phim
    if (updateData.filmId) {
      const film = await Film.findOne({
        _id: updateData.filmId,
        deleted: false,
      });

      if (!film) {
        res.status(404).json({ message: "Không tìm thấy phim" });
        return;
      }
    }

    // 4. Nếu update cinemaId, kiểm tra rạp
    if (updateData.cinemaId) {
      const cinema = await Cinema.findOne({
        _id: updateData.cinemaId,
        deleted: false,
      });

      if (!cinema) {
        res.status(404).json({ message: "Không tìm thấy rạp chiếu" });
        return;
      }
    }

    // 5. Nếu update thời gian, kiểm tra xung đột
    if (updateData.startTime || updateData.endTime) {
      const checkStartTime = updateData.startTime || currentShowtime.startTime;
      const checkEndTime = updateData.endTime || currentShowtime.endTime;
      const checkRoomId = updateData.roomId || currentShowtime.roomId;

      const hasConflict = await checkTimeConflict(
        checkRoomId.toString(),
        checkStartTime,
        checkEndTime,
        id // Loại trừ chính showtime này
      );

      if (hasConflict) {
        res.status(400).json({
          message: "Khoảng thời gian này bị trùng với suất chiếu khác trong cùng phòng",
        });
        return;
      }
    }

    // 6. Update showtime
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

// [DELETE] DELETE SHOWTIME: /api/v1/showtimes/:id
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const showtime = await ShowTime.findById(id);

    if (!showtime) {
      res.status(404).json({ message: "Không tìm thấy suất chiếu" });
      return;
    }

    // Kiểm tra xem có ghế nào đã được đặt chưa
    const hasBookedSeats = showtime.seats.some(
      (seat) => seat.status === ShowTimeSeatStatus.BOOKED
    );

    if (hasBookedSeats) {
      res.status(400).json({
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