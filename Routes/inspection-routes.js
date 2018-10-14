"use strict";
const express = require('express');
const router = express.Router();
const inspection_api = require("../Controllers/");
function body_logger_middleware(req, res, next) {
    console.log("req body \n", JSON.stringify(req.body));
    next();
}
router.post("/authorise_user", inspection_api.inspection_controller.register_login_user_with_role);
router.post("/add_inspection", inspection_api.inspection_controller.add_inspection_venue);
router.post("/paginate_inspection_list", inspection_api.inspection_controller.paginate_inspection_list);

module.exports = router;