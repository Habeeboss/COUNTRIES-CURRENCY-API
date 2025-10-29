module.exports.errorHandler = (err, req, res, next) => {
    console.error("🔥 Error:", err);

    const status = err.status || 500;
    let response = {
        error: err.message || "Internal server error"
    };
    
    if (err.details) {
        response.details = err.details;
    }

    res.status(status).json(response);
};
