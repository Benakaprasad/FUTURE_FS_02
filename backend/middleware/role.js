const authorizeRole = (...roles) => (req, res, next) => {
    if (!req.user?.role) {
        return res.status(403).json({ success: false, error: 'Access denied — no role found' });
    }
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: `Access denied — required: ${roles.join(' or ')}`
        });
    }
    next();
};

export default authorizeRole;