"use strict";
const DAOManager = require('../DOAManager');
const sendResponse = require('../Utils/sendResponse');
const commonFunctions = require("./commonFunctions");
const async = require("async");
const _ = require("lodash");
const moment = require("moment");
const validator = require("validator");

exports.register_login_user_with_role = function (req, res) {
    let user_role_id = parseInt(req.body.user_role_id || "1"),
        email = req.body.email || "",
        password = req.body.password || "",
        first_name = req.body.first_name || "",
        last_name = req.body.last_name || "",
        phone = req.body.phone || "",
        phone_code = req.body.phone_code || "",
        latitude = req.body.latitude || "",
        longitude = req.body.longitude || "",
        current_time_stamp = _.now(),
        device_type = req.body.device_type || "",
        app_version = req.body.app_version || "",
        manvalues = [email, password, first_name, last_name],
        cb = commonFunctions.checkBlank(manvalues);
    if (cb == 1) return sendResponse.parameterMissingError(res);
    if (!validator.isEmail(email)) return sendResponse.sendErrorMessage("Invalid Email Address", res);
    let new_account = "NO";
    let warning_messages = "Please Verify Your Email !";
    let data_to_send = {};
    let tasks = {
        check_user_email: function (callback) {
            let sql = "select first_name, last_name, user_role_id, email, is_email_verified, user_status, password from user where email = ?";
            return DAOManager.sql_runner(sql, [email], callback);
        },
        crypt_password: function (check_user_email, callback) {
            if (check_user_email && check_user_email.length) {
                return commonFunctions.compare_crypt_data(password, check_user_email[0].password, (err, data) => {
                    if (data && (data == true || data == "true")) return callback();
                    return callback("Wrong password for existing email, Enter correct password or create new account");
                });
            }
            new_account = "YES";
            return commonFunctions.crypt_data(password, callback);
        },
        add_user_to_db: function (check_user_email, crypt_password, callback) {
            if (check_user_email && check_user_email.length) {
                data_to_send = { ...check_user_email[0] };
                return callback(null, check_user_email[0]);
            }
            else {
                let fields = [];
                let values = [];
                data_to_send = {
                    user_role_id,
                    email,
                    is_email_verified: 0,
                    first_name,
                    last_name,
                    user_status: "ACTIVE"
                };
                if (user_role_id) { fields.push("user_role_id"); values.push(user_role_id); }
                if (email) { fields.push("email"); values.push(email); }
                if (password) { fields.push("password"); values.push(crypt_password); }
                if (first_name) { fields.push("first_name"); values.push(first_name); }
                if (last_name) { fields.push("last_name"); values.push(last_name); }
                if (phone) { fields.push("phone"); values.push(phone); }
                if (phone_code) { fields.push("phone_code"); values.push(phone_code); }
                if (latitude) { fields.push("latitude"); values.push(latitude); }
                if (longitude) { fields.push("longitude"); values.push(longitude); }
                return DAOManager.insert_sql_query("user", fields, values, callback);
            }
        },
        create_access_token: function (add_user_to_db, callback) {
            let token_data = { email: email, created_at: current_time_stamp, device_type: device_type, app_version: app_version };
            return commonFunctions.ciper_token(token_data, callback);
        },
        update_user_meta_info: function (create_access_token, callback) {
            let update_data = { access_token: create_access_token, updated_at: new Date() };
            let where = { email: email };
            if (new_account == "NO") {
                if (user_role_id) update_data["user_role_id"] = user_role_id;
                if (latitude) update_data["latitude"] = latitude;
                if (longitude) update_data["longitude"] = longitude;
            }
            return DAOManager.update_sql_query("user", update_data, where, callback);
        }
    };
    return async.autoInject(tasks, (err, data) => {
        if (err) {
            if (_.isString(err)) return sendResponse.sendErrorMessage(err, res);
            return sendResponse.somethingWentWrong(res);
        }
        data_to_send["access_token"] = data.create_access_token;
        if (data_to_send.password) delete data_to_send.password;
        if (data_to_send.is_email_verified == 1) warning_messages = "";
        return sendResponse.sendSuccessData(data_to_send, res, warning_messages);
    });
}


exports.add_inspection_venue = function (req, res) {
    let access_token = req.body.access_token || "",
        venue_type_id = req.body.venue_type_id || "",
        description = req.body.description || "",
        inspector_email = req.body.inspector_email,
        inspector_first_name = req.body.inspector_first_name || "",
        inspector_last_name = req.body.inspector_last_name || "",
        inspection_start_time = req.body.inspection_start_time || new Date(),
        latitude = req.body.latitude || "",
        longitude = req.body.longitude || "",
        status = req.body.status || "",
        status_updated_at = req.body.status_updated_at || "",
        device_type = req.body.device_type || "",
        app_version = req.body.app_version || "",
        manvalues = [venue_type_id, description, latitude, longitude, status, inspector_email],
        cb = commonFunctions.checkBlank(manvalues);
    if (cb == 1) return sendResponse.parameterMissingError(res);
    if (!access_token) return sendResponse.invalid_access(res);
    let lat_long = latitude + "," + longitude;
    console.log("lat_long", lat_long);
    if (!validator.isEmail(inspector_email)) return sendResponse.sendErrorMessage("Invalid Inspector Email", res);
    if (!validator.isLatLong(lat_long)) return sendResponse.sendErrorMessage("Invalid Lat long", res);
    let email, warning_messages = "", user_info = {}, add_new_inspector = "YES";
    let tasks = {
        authenticate_user: function (callback) {
            return commonFunctions.authenticate_user(access_token, (err, data) => {
                if (err) return sendResponse.invalid_access(res);
                email = data.email || "";
                return callback();
            });
        },
        check_user_information: function (authenticate_user, callback) {
            let sql = "select id, user_role_id, email, is_email_verified, user_status, password from user where email = ? and access_token = ?";
            return DAOManager.sql_runner(sql, [email, access_token], callback);
        },
        validate_user: function (check_user_information, callback) {
            if (check_user_information && check_user_information == 0) return sendResponse.invalid_access(res);
            user_info = { ...check_user_information[0] };
            if (user_info.is_email_verified == 0) warning_messages += "Please Verify Your Email";
            if (user_info.user_status == "BLOCKED") return sendResponse.sendErrorMessage("Account Blocked !", res);
            if (user_info.user_role_id != 2) return sendResponse.sendErrorMessage("Please Login with admin access role to add inspections !", res);
            return callback();
        },
        check_inspector_information: function (validate_user, callback) {
            let sql = "select id, user_role_id, email, is_email_verified, user_status, password from user where email = ? ";
            return DAOManager.sql_runner(sql, [inspector_email], callback);
        },
        validate_inspector: function (check_inspector_information, callback) {
            let inspector_user_id = "";
            if (check_inspector_information && check_inspector_information.length) {
                add_new_inspector = "NO";
                let inspector = { ...check_inspector_information[0] };
                inspector_user_id = inspector.id;
                if (inspector.is_email_verified == 0) warning_messages += "Please Verify Your Email";
                if (inspector.user_status == "BLOCKED") return sendResponse.sendErrorMessage("Selected Inspector account is blocked !", res);
                if (inspector.user_role_id != 1) return sendResponse.sendErrorMessage("You can only assign user with inspector role !", res);
                return callback(null, inspector_user_id);
            }
            let fields = [];
            let values = [];
            fields.push("user_role_id");
            values.push(1);
            if (inspector_email) { fields.push("email"); values.push(inspector_email); }
            if (inspector_first_name) { fields.push("first_name"); values.push(inspector_first_name); }
            if (inspector_last_name) { fields.push("last_name"); values.push(inspector_last_name); }
            return DAOManager.insert_sql_query("user", fields, values, (err, data) => {
                if (err) return callback(err);
                inspector_user_id = data.insertId;
                return callback(null, inspector_user_id);
            });
        },
        add_inspection: function (validate_inspector, callback) {
            let fields = [];
            let values = [];
            fields.push("user_id");
            values.push(validate_inspector);
            if (venue_type_id) { fields.push("venue_type_id"); values.push(venue_type_id); }
            if (description) { fields.push("description"); values.push(description); }
            if (inspection_start_time) { fields.push("inspection_start_time"); values.push(inspection_start_time); }
            if (latitude) { fields.push("latitude"); values.push(latitude); }
            if (longitude) { fields.push("longitude"); values.push(longitude); }
            if (status) { fields.push("status"); values.push(status); }
            fields.push("status_updated_at");
            values.push(new Date());
            return DAOManager.insert_sql_query("inspection", fields, values, callback);
        }
    };
    return async.autoInject(tasks, (err, data) => {
        if (err) return sendResponse.sendErrorMessage("Something went wrong ! Please Try again", res);
        return sendResponse.sendSuccessData({}, res, "Inspection venue added !");
    });
}

exports.paginate_inspection_list = function (req, res) {
    let current_page = parseInt(req.body.current_page || "0");
    let limit = parseInt(req.body.limit || "10");
    let access_token = req.body.access_token || "";
    let search_term = req.body.search_term || "";
    let status_filter = req.body.status_filter || ""; // PENDING
    let venue_filter = req.body.venue_filter || "1";
    // let latitude = req.body.latitude || 23.03386300;
    let latitude = req.body.latitude || "";

    let longitude = req.body.longitude || "";
    // let longitude = req.body.longitude || 72.58502200;

    let radius_to_search = parseInt(req.body.radius_to_search || "100"); // by default 10kms
    let stat_date = req.body.inspection_date || "";
    let end_date = req.body.end_date || "";
    let sorting_order = req.body.sorting_order || "asc";
    let skip = current_page * limit;
    if (!access_token) return sendResponse.invalid_access(res);
    if (stat_date) {
        if (!end_date) {
            end_date = moment(stat_date).endOf("day").format("YYYY-MM-DD HH:mm");
            stat_date = moment(stat_date).startOf("day").format("YYYY-MM-DD HH:mm");
        }
        if (end_date) {
            end_date = moment(end_date).format("YYYY-MM-DD HH:mm");
            stat_date = moment(stat_date).format("YYYY-MM-DD HH:mm");
        }
    }
    console.log("start", stat_date);
    console.log("end_date", end_date);
    let email = "", warning_messages = "";
    let tasks = {
        authenticate_user: function (callback) {
            return commonFunctions.authenticate_user(access_token, (err, data) => {
                if (err) return sendResponse.invalid_access(res);
                email = data.email || "";
                return callback();
            })
        },
        check_user_information: function (authenticate_user, callback) {
            let sql = "select id, user_role_id, email, is_email_verified, user_status, password from user where email = ? and access_token = ?";
            return DAOManager.sql_runner(sql, [email, access_token], callback);
        },
        validate_user: function (check_user_information, callback) {
            if (check_user_information && check_user_information == 0) return sendResponse.invalid_access(res);
            let user_info = { ...check_user_information[0] };
            if (user_info.is_email_verified == 0) warning_messages += "Please Verify Your Email";
            if (user_info.user_status == "BLOCKED") return sendResponse.sendErrorMessage("Account Blocked !", res);
            if (user_info.user_role_id != 2) return sendResponse.sendErrorMessage("Please Login with admin access role to add inspections !", res);
            return callback();
        },
        get_list: function (validate_user, callback) {
            let values = [];
            let sql = "SELECT ins.id, ins.user_id, ins.venue_type_id, ins.description, ins.inspection_start_time, ins.latitude, ins.longitude, ins.status, ins.is_active, ins.status_updated_at, u.email, u.first_name,u.last_name, u.user_role_id,u.user_status ";
            if (latitude && longitude) {
                sql += ", (6371 * acos(cos(radians(" + latitude + "))";
                sql += "* cos(radians(ins.latitude))";
                sql += "* cos(radians(ins.longitude) - radians(" + longitude + "))";
                sql += "+ sin(radians(" + latitude + "))";
                sql += "* sin(radians(ins.latitude)))) AS distance_in_kms "
            }
            sql += " FROM inspection ins left JOIN user u on ins.user_id = u.id "
            sql += " where ins.is_active = 1 ";
            if (search_term) {
                sql += " and ( ins.description like '%" + search_term + "%' or u.email like '%" + search_term + "%' or  u.first_name like '%" + search_term + "%' or u.last_name like '%" + search_term + "%'  ) "
            }
            if (status_filter) {
                sql += " and ins.status = ? ";
                values.push(status_filter);
            }
            if (venue_filter) {
                sql += " and ins.venue_type_id = ? ";
                values.push(venue_filter);
            }
            if (stat_date) {
                sql += " and ( ins.inspection_start_time between '" + stat_date + "' and '" + end_date + "' ) ";
            }
            if (latitude && longitude) {
                sql += " having distance_in_kms < ?";
                values.push(radius_to_search);
            }
            if (sorting_order == "desc") {
                sql += " order by ins.inspection_start_time desc ";
            }
            if (sorting_order == "asc") {
                sql += " order by ins.inspection_start_time asc ";
            }
            sql += " limit " + skip + " , " + limit;
            return DAOManager.sql_runner(sql, values, callback);
        },
        get_count: function (check_user_information, callback) {
            let values = [];
            let subquery = "NO";
            let sql = "SELECT count(*) as total_count ";
            let new_query = "";
            if (latitude && longitude) {
                subquery = "YES";
                sql = "SELECT ";
                sql += " (6371 * acos(cos(radians(" + latitude + "))";
                sql += "* cos(radians(ins.latitude))";
                sql += "* cos(radians(ins.longitude) - radians(" + longitude + "))";
                sql += "+ sin(radians(" + latitude + "))";
                sql += "* sin(radians(ins.latitude)))) AS distance_in_kms "
            }
            sql += " FROM inspection ins left JOIN user u on ins.user_id = u.id "
            sql += " where ins.is_active = 1 ";
            if (search_term) {
                sql += " and ( ins.description like '%" + search_term + "%' or u.email like '%" + search_term + "%' or  u.first_name like '%" + search_term + "%' or u.last_name like '%" + search_term + "%'  ) "
            }
            if (status_filter) {
                sql += " and ins.status = ? ";
                values.push(status_filter);
            }
            if (venue_filter) {
                sql += " and ins.venue_type_id = ? ";
                values.push(venue_filter);
            }
            if (stat_date) {
                sql += " and ( ins.inspection_start_time between '" + stat_date + "' and '" + end_date + "' ) ";
            }
            if (latitude && longitude) {
                sql += " having distance_in_kms < ?";
                values.push(radius_to_search);
            }
            if (subquery == "YES") {
                new_query = "select count(*) as total_count from ( " + sql + " ) as sub_query ";
                return DAOManager.sql_runner(new_query, values, (err, data) => {
                    if (err) return callback(err);
                    if (data && data.length) return callback(null, data[0].total_count);
                    return callback(null, 0);
                });
            }
            return DAOManager.sql_runner(sql, values, (err, data) => {
                if (err) return callback(err);
                if (data && data.length) return callback(null, data[0].total_count);
                return callback(null, 0);
            });
        }
    };

    return async.autoInject(tasks, (err, data) => {
        if (err) {
            if (_.isString(err)) return sendResponse.sendErrorMessage(err, res);
            return sendResponse.somethingWentWrong(res);
        }
        let resp = {
            current_page: current_page,
            list: data.get_list || [],
        };
        if (current_page == 0) {
            resp["total_pages"] = _.ceil(data.get_count / limit) || 0;
            resp["total_records"] = data.get_count || 0;
        }
        return sendResponse.sendSuccessData(resp, res);
    });
}