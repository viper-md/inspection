"use strict";
const bcrypt = require('bcryptjs');
const Jwt = require('jsonwebtoken');
const key = 'ertyuixcvbnmRANDOMyuikjbvcfghj';
exports.authenticate_user = function (token, callback) {
    return Jwt.verify(token, key, (err, info) => {
        if (err) return callback(err);
        return callback(null, info);
    })
}
exports.ciper_token = function (tokenData, callback) {
    return Jwt.sign(tokenData, key, { algorithm: 'HS256' }, function (err, token) {
        console.log('token-----' + token + '-----token value');
        return callback(null, token);
    })
}
exports.crypt_data = function (data, callback) {
    return bcrypt.hash(data, 8, (err, hash) => {
        if (err)
            return callback(err);
        return callback(null, hash);
    });
}
exports.compare_crypt_data = function (data, hash, callback) {
    return bcrypt.compare(data, hash, (error, result) => {
        if (error)
            return callback(error);
        return callback(null, result);
    })
}
exports.checkBlank = function (arr) {
    var arrlength = arr.length;
    for (var i = 0; i < arrlength; i++) {
        if (arr[i] == '') {
            return 1;
        }
        else if (arr[i] == undefined) {
            return 1;
        }
        else if (arr[i] == '(null)') {
            return 1;
        }
    }
    return 0;
}