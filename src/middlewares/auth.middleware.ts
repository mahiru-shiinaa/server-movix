import { Request, Response, NextFunction } from "express";
import User from "../api/v1/models/user.model";
import { UserStatus } from "../types/user.type";

export const authMiddleware =
  (role: string) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies.token;
      if (!token) {
        res
          .status(401)
          .json({ Code: 400, message: "Dữ liệu lỗi, vui lòng đăng nhập lại" });
        return;
      }
      const user = await User.findOne({ token: token, deleted: false }).select(
        "-password -token" 
      );
      if (!user) {
        res.status(401).json({ Code: 400, message: "Tài khoản không tồn tại" });
        return;
      }
      if(user.status === UserStatus.BLOCKED) {
        res.status(401).json({ Code: 400, message: "Tài khoản đã bị khóa" });
        return;
      }
      if (user.role !== role) {
        res.status(401).json({ Code: 400, message: "Role is not correct!!!, Tài khoản không có quyền truy cập!"});
        return;
      }
      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi server" });
    }
  };
