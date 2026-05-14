router.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

router.put("/users/:id", (req, res) => {
  const { id } = req.params;

  db.query("UPDATE users SET ? WHERE id = ?", [req.body, id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Updated" });
  });
});