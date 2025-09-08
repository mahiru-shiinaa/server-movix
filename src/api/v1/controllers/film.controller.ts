import { Request, Response } from "express";
import Film from "../models/film.model";
import { IFilmCreate, IFilmUpdate } from "../../../types/film.type";
import { CommonStatus } from "../../../types/common.type";
import { UserRole } from "../../../types/user.type";


//[GET] DETAIL: /api/v1/films/:slug
//[GET] DETAIL: /api/v1/films/:slug
export const detail = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug;
    
    // Kiểm tra quyền user
    const isAdmin = req.user && req.user.role === UserRole.ADMIN;
    
    let query: any = { slug };
    
    // Nếu không phải admin, chỉ hiển thị film active và chưa bị xóa
    if (!isAdmin) {
      query = {
        slug,
        status: CommonStatus.ACTIVE,
        deleted: false
      };
    }
    
    const film = await Film.findOne(query).populate({
      path: "categoryIds",
      select: "title",
    });
    
    if (!film) {
      res.status(404).json({ 
        message: isAdmin 
          ? "Không tìm thấy film" 
          : "Film không tồn tại hoặc chưa được công bố" 
      });
      return;
    }
    
    // Admin thấy tất cả thông tin, guest chỉ thấy thông tin công khai
    let responseData = film.toObject();
    

    res.status(200).json({
      code: 200,
      message: "Thành công",
      data: responseData
    });
    
  } catch (error) {
    console.error('Film detail error:', error);
    res.status(500).json({ message: "Lỗi server khi lấy thông tin film" });
  }
};


//[POST] CREATE: /api/v1/films
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const createData = req.body as IFilmCreate;
    const film = await Film.create(createData);
    res.status(200).json(film); // không cần return
  } catch (error) {
    res.status(500).json({ message: "Create film failed", error });
  }
};

//[PATCH] EDIT: /api/v1/films/:id
export const edit = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const updateData = req.body as IFilmUpdate;
    const film = await Film.findByIdAndUpdate(id, updateData, { new: true });
    if(!film) {
      res.status(404).json({ message: "Không tìm thấy film" });
      return;
    }
    res.status(200).json(film);
  } catch (error) {
    res.status(500).json({ message: "Update film failed", error });
  }
};

//[DELETE] DELETE: /api/v1/films/:id
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const film = await Film.findById(id);
    if(!film) {
      res.status(404).json({ message: "Không tìm thấy film" });
      return;
    }
    film.deleted = true;
    await film.save();
    res.status(200).json({
      message: "Xóa film thành công",

    });
  } catch (error) {
    res.status(500).json({ message: "Delete film failed", error });
  }
};

