import { Express } from "express";
import categoryRoutes from "./category.route";
import cityRoutes from "./city.route";
import comboFoodRoutes from "./comboFood.route";
import userRoutes from "./user.route";
import authRoutes from "./auth.route";
const mainV1Routes = (app: Express) => {
  const version = "/api/v1";

  // [API] Public
  app.use(version + "/categories", categoryRoutes);
  app.use(version + "/cities", cityRoutes);
  app.use(version + "/combofoods", comboFoodRoutes);

  // [API] Private
  app.use(version + "/users", userRoutes);
  app.use(version + "/auth", authRoutes);


};

export default mainV1Routes;