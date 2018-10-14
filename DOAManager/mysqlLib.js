"use strict";
let mysql = require('mysql');
let db_config = {
    host: config.get("databaseSettings.host"),
    user: config.get("databaseSettings.user"),
    port: config.get("databaseSettings.port"),
    password: config.get("databaseSettings.password"),
    database: config.get("databaseSettings.database"),
    connectionLimit: 5,
    multipleStatements: true,
};

function initializeConnectionPool(db_config) {
    console.log("db config : " + JSON.stringify(db_config));
    let numConnectionsInPool = 0;
    let conn = mysql.createPool(db_config);
    conn.on('connection', function (connection) {
        numConnectionsInPool++;
        console.log('Number Of Connection in pool ', numConnectionsInPool);
    });
    function keep_alive() {
        conn.getConnection((err, connect) => {
            if (err) return;
            connect.ping();
            connect.release();
        });
    }
    // setInterval(keep_alive, 3000); // ping be used if connection drops for some reason
    return conn;
}
global.connection = initializeConnectionPool(db_config);