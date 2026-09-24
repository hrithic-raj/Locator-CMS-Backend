import { Category } from "../models/Category.js";
import { createTaxonomyService } from "../services/taxonomy.service.js";
import { createTaxonomyController } from "../controllers/taxonomy.controller.js";
import { createTaxonomyRouter } from "./taxonomy.routes.js";

const categoryService = createTaxonomyService(Category, "category");
const categoryController = createTaxonomyController(categoryService);

export default createTaxonomyRouter(categoryController);
