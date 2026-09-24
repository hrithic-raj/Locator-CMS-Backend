import { Tag } from "../models/Tag.js";
import { createTaxonomyService } from "../services/taxonomy.service.js";
import { createTaxonomyController } from "../controllers/taxonomy.controller.js";
import { createTaxonomyRouter } from "./taxonomy.routes.js";

const tagService = createTaxonomyService(Tag, "tag");
const tagController = createTaxonomyController(tagService);

export default createTaxonomyRouter(tagController);
