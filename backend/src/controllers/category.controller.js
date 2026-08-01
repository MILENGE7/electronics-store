const prisma = require("../config/db");

// Public: list all categories (used by the product form and future filters)
async function listCategories(req, res, next) {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

// Admin: create a category
async function createCategory(req, res, next) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (existing) return res.status(409).json({ error: "A category with that name already exists" });

    const category = await prisma.category.create({ data: { name: name.trim() } });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

// Admin: delete a category (blocked if products still reference it)
async function deleteCategory(req, res, next) {
  try {
    const productCount = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (productCount > 0) {
      return res.status(400).json({ error: `Cannot delete: ${productCount} product(s) still use this category` });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, createCategory, deleteCategory };
