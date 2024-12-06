import express from "express";
import WmmModel from "../../models/wmm.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/userControl/users.mjs";


const router = express.Router();

router.get("/", async (req, res) => {
  const io = req.io;
  try {
    const { page = 1, limit = 1000 } = req.query;

    const startIndex = (page - 1) * limit;

    const totalSub = await WmmModel.find().countDocuments();
    const totalPages = Math.ceil(totalSub / limit);

    const wmm = await WmmModel.find()
      .select(
        "id clientid subsdate enddate renewdate subsyear copies remarks paymtamt paymtmasses calender subsclass donorid adddate adduser"
      )
      .sort({ id: -1 })
      .limit(limit)
      .skip(startIndex);

    io.emit("wmm-update", { type: "init", data: wmm });
    res.json(wmm);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
