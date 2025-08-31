import { Express } from "express";
import categoryRoutes from "./category.route";
import cityRoutes from "./city.route";
import comboFoodRoutes from "./comboFood.route";
const mainV1Routes = (app: Express) => {
  const version = "/api/v1";

  // [API] Public
  app.use(version + "/categories", categoryRoutes);
  app.use(version + "/cities", cityRoutes);
  app.use(version + "/combofoods", comboFoodRoutes);
};

export default mainV1Routes;