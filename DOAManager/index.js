'use strict';
let log4js = require('log4js');
let logger = log4js.getLogger('[DaoManager]');
logger.level = 'debug';
exports.sql_runner = function (sql, arr, callback) {
    return connection.query(sql, arr, function (err, data) {
        if (err) {
            logger.fatal("(run) (DB Error) ", err);
            return callback(err)
        }
        else {
            return callback(null, data);
        }
    })
};

exports.update_sql_query_two = function (table, data, where, callback) {
    try {
        data = data.join(' , ');
        where = where.join(' and ');
        let sql = "UPDATE `" + table + "` SET " +
            data +
            " WHERE " +
            where;
        return connection.query(sql, function (err, done) {
            if (err) { logger.fatal("(updateTable) (DB Error) ", err); return callback(err); }
            return callback(null, done);
        });
    }
    catch (e) {
        return logger.fatal("(updateTable) (DB Error) ", err);
    }

}
exports.update_sql_query = function (table, data, where, callback) {
    var sql = "UPDATE " + table + " SET ? where ? ";
    return connection.query(sql, [data, where], function (err, done) {
        if (err) { logger.fatal("(updateTable) (DB Error) ", err); return callback(err); }
        logger.info("(updateTable)  ", done);
        return callback(null, done);
    });
}

exports.insert_sql_query = function (table, data, value, callback) {
    let dumpString = data.join(' , ');
    let arr = new Array(value.length);
    for (let i = 0; i < arr.length; i++) arr[i] = ' ? ';
    let queryString = arr.join(',');
    let sql = "INSERT into " + table + " " +
        " (" + dumpString + ")" +
        " VALUES ( " + queryString + " ) ";
    connection.query(sql, value, function (err, done) {
        if (err) { logger.fatal("(insertsqlquery) (DB Error)", err); return callback(err) };
        return callback(null, done);
    });
}