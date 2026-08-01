const express = require("express");
const { listCategories, createCategory, deleteCategory } = require("../controllers/category.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", listCategories);
router.post("/", requireAuth, requireAdmin, createCategory);
router.delete("/:id", requireAuth, requireAdmin, deleteCategory);

module.exports = router;
