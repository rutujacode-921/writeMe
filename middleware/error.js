function notFound(req, res, next) {
    res.status(404).render("errors/404");
}

function serverError(err, req, res, next) {
    console.error("[500]", err);
    const status = err.status || 500;
    if (status === 403 && err.code === "EBADCSRFTOKEN") {
        return res.status(403).render("errors/csrf");
    }
    res.status(status).render("errors/500", {
        message: err.publicMessage || null,
    });
}

module.exports = { notFound, serverError };
