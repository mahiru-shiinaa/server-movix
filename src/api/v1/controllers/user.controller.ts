import { Request, Response } from "express";
import User from "../models/user.model";
// ✅ THAY ĐỔI: Import bcrypt thay vì md5
// import md5 from "md5"; // ❌ Xóa md5
import { hashPassword, comparePassword } from "../../../helpers/password";

import {  UserStatus } from "../../../types/user.type";

// --- ADMIN ---
//[GET] LIST: /api/v1/users
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ deleted: false }).select("-password");
    res.json({ code: 200, message: "Thành công", users: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Loi server" });
  }
};

//[GET] DETAIL: /api/v1/users/:id
export const detail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id : string = req.params.id;
    const user = await User.findById(id).select("-password");
    if(!user) {
      res.status(404).json({ message: "Không tìm thấy user" });
      return;
    }
    res.json({ code: 200, message: "Thành công", user: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Loi server" });
  }
};

// --- USER ---
//[GET] DETAIL: /api/v1/users/me
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ code: 200, message: "Thành công", user: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Loi server" });
  }
};

// [PATCH] EDIT: /api/v1/users/me
export const edit = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.user._id },
      req.body,
      { new: true }
    );
    res.json({ code: 200, message: "Cập nhật thành công", user: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Loi server" });
  }
};

// Hoàn thiện sau
// //[DELETE] /api/v1/users/me
// export const remove = async (req: Request, res: Response): Promise<void> => {
//   try {
//     await User.findByIdAndDelete(req.user._id);
//     res.json({ code: 200, message: "Xoa tai khoan thanh cong" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Loi server" });
//   }
// }

//[PATCH] /api/v1/users/me/change-password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findOne({ _id: req.user._id, deleted: false, status: UserStatus.ACTIVE });
    
    if(!user) {
      res.status(400).json({ code: 400, message: "Tài khoản không tồn tại!" });
      return ;
    }
    
    // ✅ THAY ĐỔI: Dùng bcrypt để so sánh password cũ
    const isOldPasswordCorrect = await comparePassword(oldPassword, user.password);
    if (!isOldPasswordCorrect) {
      res.status(400).json({ code: 400, message: "Mật khẩu cũ không chính xác!" });
      return ;
    }
    
    // ✅ Kiểm tra password mới có giống password cũ không
    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      res.status(400).json({ code: 400, message: "Mật khẩu mới không được giống mật khẩu cũ!" });
      return ;
    }
    
    // ✅ Hash password mới và lưu vào database
    user.password = await hashPassword(newPassword);
    await user.save();
    
    res.status(200).json({ code: 200, message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Loi server" });
  }
};