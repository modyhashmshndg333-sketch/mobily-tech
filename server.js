const express = require("express");
const startDatabase = require("./database/db");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let db;
let saveDatabase;

function rows(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = [];
  while (stmt.step()) result.push(stmt.getAsObject());
  stmt.free();
  return result;
}

app.get("/api/categories", (req, res) => {
  res.json(rows("SELECT * FROM categories ORDER BY id"));
});

app.post("/api/categories", (req, res) => {
  const { name, parent_id = null } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "اكتب اسم القسم" });
  }

  if (parent_id !== null) {
    if (!rows("SELECT id FROM categories WHERE id = ?", [parent_id]).length) {
      return res.status(404).json({ error: "القسم الرئيسي غير موجود" });
    }
  }

  db.run("INSERT INTO categories (name, parent_id) VALUES (?, ?)",
    [name.trim(), parent_id]);
  saveDatabase();
  res.json({ message: "تمت إضافة القسم بنجاح" });
});

app.put("/api/categories/:id", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "اكتب الاسم الجديد" });
  }

  db.run("UPDATE categories SET name = ? WHERE id = ?",
    [name.trim(), Number(req.params.id)]);
  saveDatabase();
  res.json({ message: "تم تعديل اسم القسم" });
});

app.delete("/api/categories/:id", (req, res) => {
  const id = Number(req.params.id);
  if (rows("SELECT id FROM categories WHERE parent_id = ?", [id]).length ||
      rows("SELECT id FROM products WHERE category_id = ?", [id]).length) {
    return res.status(400).json({
      error: "انقل الفروع والمنتجات أولًا قبل الحذف"
    });
  }

  db.run("DELETE FROM categories WHERE id = ?", [id]);
  saveDatabase();
  res.json({ message: "تم حذف القسم" });
});
// عرض جميع المنتجات
app.get("/api/products", (req, res) => {
  res.json(rows("SELECT * FROM products ORDER BY id DESC"));
});

// إضافة منتج جديد
app.post("/api/products", (req, res) => {
  const { category_id, name, price = "", image = "", stock = 0 } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "اكتب اسم المنتج" });
  }

  const quantity = Number(stock);
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: "كمية المخزون غير صحيحة" });
  }

  if (!rows("SELECT id FROM categories WHERE id = ?", [category_id]).length) {
    return res.status(404).json({ error: "القسم غير موجود" });
  }

  db.run(
    "INSERT INTO products (category_id, name, price, image, stock) VALUES (?, ?, ?, ?, ?)",
    [Number(category_id), name.trim(), String(price), String(image), quantity]
  );

  saveDatabase();
  res.json({ message: "تمت إضافة المنتج بنجاح" });
});

// تعديل منتج
app.put("/api/products/:id", (req, res) => {
  const { category_id, name, price = "", image = "", stock = 0 } = req.body;
  const quantity = Number(stock);

  if (!name || !name.trim() || !Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ error: "راجع اسم المنتج وكمية المخزون" });
  }

  if (!rows("SELECT id FROM categories WHERE id = ?", [category_id]).length) {
    return res.status(404).json({ error: "القسم غير موجود" });
  }

  db.run(
    "UPDATE products SET category_id=?, name=?, price=?, image=?, stock=? WHERE id=?",
    [Number(category_id), name.trim(), String(price), String(image), quantity, Number(req.params.id)]
  );

  saveDatabase();
  res.json({ message: "تم تعديل المنتج بنجاح" });
});

// حذف منتج
app.delete("/api/products/:id", (req, res) => {
  db.run("DELETE FROM products WHERE id = ?", [Number(req.params.id)]);
  saveDatabase();
  res.json({ message: "تم حذف المنتج" });
});
async function startServer() {
  const database = await startDatabase();
  db = database.db;
  saveDatabase = database.saveDatabase;

  app.listen(3000, "0.0.0.0", () => {
    console.log("موقع موبايل تك يعمل على المنفذ 3000");
  });
}

startServer();
