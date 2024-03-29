import { trace } from "console";
import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../db";
const router = Router();
import jwtGenerator from "../utils/jwtGenerator";
import validInfo from "../middleware/validinfo";
import authorization from "../middleware/authorization";

router.route("/register").post(validInfo, async (req, res) => {
  try {
    // 1. desctructure the req.body
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.json({ missingCredentials: "Missing credentials" });
    }
    // 2. check if the user exists
    const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [
      email,
    ]);
    if (user.rows[0])
      return res.status(401).json({ userAlreadyExists: "User already exists" }); // 401 means unauthorized
    // res.json(user.rows);
    // 3.bcrypt the password
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const bcryptPassword = await bcrypt.hash(password, salt);
    //4. enter the user in the database
    const newUser = await pool.query(
      "INSERT INTO users (user_name, user_email, user_password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, bcryptPassword]
    );
    // res.json(newUser.rows[0]);
    //5. generating our jwt token
    const token = jwtGenerator(newUser.rows[0].user_id);
    return res.json({ token });
  } catch (error) {
    trace(error);
    res.status(500).json("Server error");
  }
});
// it is called middleware because is called in the middle of the request
router.route("/login").post(validInfo, async (req, res) => {
  try {
    // 1. desctructure the req.body
    const { email, password } = req.body;
    //2 check if the user exists if not throw error
    const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [
      email,
    ]);
    if (!user.rows[0])
      return res
        .status(401)
        .json({ passwordOrEmailIsIncorrect: "Password or email is incorrect" }); // 401 means unthenticated
    // 3. check if the password is correct, the password is the same as the one in the database
    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].user_password
    ); // compare is a method of bcrypt that takes the password and the hash and returns true or false depending on if the password is correct
    if (!validPassword)
      return res.status(401).send("Password or email is incorrect");
    //4. give them the jwt token
    const token = jwtGenerator(user.rows[0].user_id);
    res.json({ token });
  } catch (error: any) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
});

router.route("/is-verify").get(authorization, async (req, res) => {
  try {
    res.json(true); // if the authorization middleware for the token is working as expected, return true
  } catch (error) {
    trace(error);
    res.status(500).send("Server error");
  }
});
export default router;
