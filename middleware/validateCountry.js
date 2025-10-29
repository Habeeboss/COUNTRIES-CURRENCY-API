module.exports.validateCountryData = (req, res, next) => {
    const { name, population, currency_code } = req.body;
    const errors = {};

    if (!name || typeof name !== "string" || name.trim() === "") {
        errors.name = "is required";
    }
    if (!population || typeof population !== "number" || population <= 0) {
        errors.population = "must be a positive number";
    }
    if (!currency_code || typeof currency_code !== "string") {
        errors.currency_code = "is required";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors
        });
    }

    next();
};
