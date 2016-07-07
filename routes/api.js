var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var modelSchema = require('../models/model');
var db = mongoose.createConnection('mongodb://127.0.0.1/legos');

var Project = db.model('projects', modelSchema.projectSchema);
var Module = db.model('modules', modelSchema.moduleSchema);

/**
 * 获取项目列表
 */
router.get('/project/list', function (req, res, next) {
    Project.find({}, function (err, data) {
        if(err){
            console.log(err);
            return res.json({
                code: 1,
                msg: 'server error.'
            });            
        }
        res.json({
            code: 0,
            data: data
        });
    });
});

/**
 * 根据pid获取项目信息
 */
router.get('/project/view/:pid', function (req, res, next) {
    var pid = req.params['pid'];
    if(!pid){
        return res.json({
            code: 1,
            msg: 'lost the required parameter project id.'
        });
    }
    Project.findById(pid, function (err, data) {
        if(err){
            console.log(err);
            return res.json({
                code: 2,
                msg: err.message
            });
        }
        res.json({
            code: 0,
            data: data
        });
    });
});

/**
 * 保存项目信息
 */
router.post('/project/add', function (req, res, next) {
    var body = req.body;
    var projectName = body.projectName || '';
    var userGroup = body.userGroup || '';

    if(projectName) {
        var p = new Project({
            name: projectName,
            userGroup: userGroup.split(',')
        });
        p.save(function (err) {
            if (err) {
                console.log(err);
                return res.json({
                    code: 1,
                    msg: JSON.stringify(err)
                });
            }
            res.json({
                code: 0,
                msg: 'success'
            });
        });
    }
    else{
        res.json({
            code: 2,
            msg: 'lost required parameter projectName.'
        });
    }
});

/**
 * 根据pid获取模块
 */
router.get('/module/list/:pid', function (req, res, next) {
    var pid = req.params['pid'];
    if(!pid){
        return res.json({
            code: 1,
            msg: 'lost the required parameter project id.'
        });
    }
    Module.find({pid: pid}, function (err, data) {
        if(err){
            console.log(err);
            return res.json({
                code: 2,
                msg: 'server error.'
            });
        }
        res.json({            
            code: 0,
            data: data
        });
    });
});

/**
 * 根据mid获取当前模块信息
 */
router.get('/module/view/:mid', function (req, res, next) {
    var mid = req.params['mid'];

    if(mid){
        Module.findById(mid, function (err, data) {
            if(err){
                console.log(err);
                return res.json({
                    code: 2,
                    msg: err.message
                });
            }
            res.json({
                code: 0,
                data: data
            });
        });
    }
    else{
        return res.json({
            code: 1,
            msg: 'lost the required parameter mid.'
        });
    }
});

/**
 * 校验模块标识符是否合法
 */
router.get('/module/check/:id', function (req, res, next) {
    var id = req.params['id'];
});

module.exports = router;