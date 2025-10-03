import { Request, Response } from "express";
import Comment from "../models/comment.model";
import Film from "../models/film.model";
import { ICommentCreate, ICommentUpdate } from "../../../types/comment.type";
import { UserRole } from "../../../types/user.type";
import { CommonStatus } from "../../../types/common.type";

// [GET] LIST ALL COMMENTS (ADMIN): /api/v1/comments
// Hiển thị tất cả comment, bao gồm cả isReported
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    // Pagination params
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query: any = {};

    // Filter by isReported nếu có
    if (req.query.isReported !== undefined) {
      query.isReported = req.query.isReported === "true";
    }

    // Filter by filmId nếu có
    if (req.query.filmId) {
      query.filmId = req.query.filmId;
    }

    // Get total count
    const total = await Comment.countDocuments(query);

    // Get paginated data
    const comments = await Comment.find(query)
      .populate({ path: "userId", select: "username avatar" })
      .populate({ path: "filmId", select: "title slug" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      code: 200,
      message: "Thành công",
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [GET] COMMENTS BY FILM SLUG (PUBLIC): /api/v1/comments/film/:slug
export const getByFilmSlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;

    // Pagination params
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Tìm film theo slug
    const film = await Film.findOne({
      slug: slug,
      status: CommonStatus.ACTIVE,
      deleted: false,
    });

    if (!film) {
      res.status(404).json({
        message: "Không tìm thấy phim",
      });
      return;
    }

    // Lấy comments của film, chỉ hiển thị những comment chưa bị reported
    const query = {
      filmId: film._id,
      isReported: false,
    };

    const total = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
      .populate({ path: "userId", select: "username avatar" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      code: 200,
      message: "Thành công",
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get comments by film error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [POST] CREATE COMMENT (USER): /api/v1/comments
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const createData = req.body as ICommentCreate;

    // Kiểm tra film có tồn tại không
    const film = await Film.findOne({
      _id: createData.filmId,
      deleted: false,
    });

    if (!film) {
      res.status(404).json({ message: "Không tìm thấy phim" });
      return;
    }

    // Gán userId từ req.user
    const commentData = {
      ...createData,
      userId: req.user!._id,
    };

    const comment = await Comment.create(commentData);

    // Populate để trả về thông tin đầy đủ
    const populatedComment = await Comment.findById(comment._id)
      .populate({ path: "userId", select: "username avatar" })
      .populate({ path: "filmId", select: "title slug" });

    res.status(201).json({
      code: 201,
      message: "Tạo bình luận thành công",
      data: populatedComment,
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [PATCH] UPDATE COMMENT (USER - OWN COMMENT): /api/v1/comments/:id
export const edit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as ICommentUpdate;

    const comment = await Comment.findById(id);

    if (!comment) {
      res.status(404).json({ message: "Không tìm thấy bình luận" });
      return;
    }

    // Kiểm tra user chỉ được sửa comment của chính mình
    if (comment.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        code: 403,
        message: "Bạn không có quyền sửa bình luận này",
      });
      return;
    }

    // Chỉ cho phép update rate và content
    const allowedFields: ICommentUpdate = {};
    if (updateData.rate !== undefined) allowedFields.rate = updateData.rate;
    if (updateData.content !== undefined)
      allowedFields.content = updateData.content;

    const updatedComment = await Comment.findByIdAndUpdate(id, allowedFields, {
      new: true,
    })
      .populate({ path: "userId", select: "username avatar" })
      .populate({ path: "filmId", select: "title slug" });

    res.status(200).json({
      code: 200,
      message: "Cập nhật bình luận thành công",
      data: updatedComment,
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [DELETE] DELETE COMMENT (USER - OWN COMMENT or ADMIN): /api/v1/comments/:id
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);

    if (!comment) {
      res.status(404).json({ message: "Không tìm thấy bình luận" });
      return;
    }

    // Logic phân quyền:
    // 1. User có thể xóa bình luận của chính mình.
    // 2. Admin có thể xóa bất kỳ bình luận nào.
    const isOwner = comment.userId.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === UserRole.ADMIN;

    // Kiểm tra quyền hạn: Nếu người dùng KHÔNG phải chủ sở hữu VÀ cũng KHÔNG phải Admin thì từ chối.
    if (!isOwner && !isAdmin) {
      res.status(403).json({
        code: 403,
        message: "Bạn không có quyền xóa bình luận này",
      });
      return;
    }

    await Comment.findByIdAndDelete(id);

    res.status(200).json({
      code: 200,
      message: "Xóa bình luận thành công",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// [PATCH] REPORT COMMENT (USER or ADMIN): /api/v1/comments/:id/report
export const report = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const comment = await Comment.findById(id);

    if (!comment) {
      res.status(404).json({ message: "Không tìm thấy bình luận" });
      return;
    }

    // Người dùng không thể báo cáo bình luận của chính mình.
    if (comment.userId.toString() === currentUser._id.toString()) {
      res.status(403).json({
        code: 403,
        message: "Bạn không thể báo cáo bình luận của chính mình",
      });
      return;
    }

    // Logic báo cáo:
    // - ADMIN có thể bật/tắt trạng thái báo cáo.
    // - USER chỉ có thể bật báo cáo (đặt isReported thành true).
    if (currentUser.role === UserRole.ADMIN) {
      // Admin có thể toggle trạng thái.
      comment.isReported = !comment.isReported;
    } else {
      // User chỉ có thể báo cáo, không thể hủy.
      if (comment.isReported) {
        res.status(200).json({
          code: 200,
          message: "Bình luận này đã được báo cáo trước đó.",
          data: comment,
        });
        return;
      }
      comment.isReported = true;
    }

    await comment.save();

    const populatedComment = await Comment.findById(id)
      .populate({ path: "userId", select: "username avatar" })
      .populate({ path: "filmId", select: "title slug" });

    res.status(200).json({
      code: 200,
      message: "Thao tác báo cáo thành công",
      data: populatedComment,
    });
  } catch (error) {
    console.error("Report comment error:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};