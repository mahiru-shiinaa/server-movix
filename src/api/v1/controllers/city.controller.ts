
import { Request, Response } from "express";
import City from "../models/city.model";

//[GET] /api/v1/cities
export const index = async (req: Request, res: Response): Promise<void> => {
  try {
    const cities = await City.find();
    if (!cities) {
      res.status(404).json({ message: "Không tìm thấy thành phố" });
      return;
    }
    res.json(cities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
    return;
  }
}
