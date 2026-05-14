import db from "../config/db.js";

export const createUser = (user, callback) => {
  const sql = `
    INSERT INTO users (name, lastName, email, password, role, phoneNumber, address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      user.name,
      user.lastName,
      user.email,
      user.password,
      user.role,
      user.phoneNumber,
      user.address,
    ],
    callback
  );
};

export const findUserByEmail = (email, callback) => {
  db.query("SELECT * FROM users WHERE email = ?", [email], callback);
};