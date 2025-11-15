const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { supplierOnly } = require("../middleware/supplierOnly");

const { getSupplierDashboard } = require("../controllers/supplierController");

router.get("/dashboard", authMiddleware, supplierOnly, getSupplierDashboard);

module.exports = router;
