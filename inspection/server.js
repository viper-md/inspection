"use strict";
process.env.NODE_CONFIG_DIR = 'Config/';
global.config = require('config');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const app = new express();
const cors = require('cors');
require("./DOAManager/mysqlLib");
app.use(cors());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
const inspectionApp = require("./Routes/inspection-routes");
app.use("/api/v1/", inspectionApp);

// swagger supported
const swagger = require("swagger-express");
app.use(swagger.init(app, {
    apiVersion: '1.0',
    swaggerVersion: '1.0',
    basePath: config.get("swaggerLink"),
    swaggerURL: '/swagger',
    swaggerJSON: '/api-docs.json',
    swaggerUI: './public/swagger/',
    apis: ['./api-doc.yml'],
}));
const startServer = http.createServer(app).listen(config.get('PORT'), function (err) {
    console.log(err ? err : 'Server Running on port' + config.get('PORT'));
    startInitialProcess();
});

function startInitialProcess() {

}
process.on('unhandledRejection', (err) => {
    console.error('An unhandledRejection error occurred!');
    console.error(err.stack)
});
process.on('uncaughtException', function (err) {
    console.error('An uncaught error occurred!');
    console.error(err.stack);
});