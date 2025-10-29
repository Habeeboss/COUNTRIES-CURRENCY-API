const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const countryController = require("../controllers/countryController");

router.post("/refresh", countryController.refreshCountries);
router.get("/status", countryController.getStatus);
router.get("/", countryController.getAllCountries);
router.get("/image", countryController.getSummaryImage);
router.get("/gdp/top", countryController.getTopCountries);
router.post("/add", countryController.addCountry);


router.get("/:name", countryController.getCountryByName);
router.delete("/:name", countryController.deleteCountry);

module.exports = router;
