var express = require('express');
var router = express.Router();
var util = require('../util/checkfilename');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var modelSchema = require('../models/model');
var db = mongoose.createConnection('mongodb://127.0.0.1/legos');
var moduleFolder = './public/modules'

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

    checkModuleId(id, function (result) {
        if(-2 === result){
            return res.json({
                code: -2,
                msg: 'mongo error.'
            });
        }else if(-1 === result){
            return res.json({
                code: -1,
                msg: 'file system error.'
            });
        }
        else if(0 === result){
            return res.json({
                code: 0,
                msg: 'not file and not record.'
            });
        }
        else if(1 === result){
            return res.json({
                code: 1,
                msg: 'file exist.'
            });
        }
        else if(2 === result){
            return res.json({
                code: 2,
                msg: 'module exist.'
            });
        }
    });
});

/**
 * 保存模块信息
 */
router.post('/module/save', function (req, res, next) {
    var body = req.body,
        _id = body._id,
        id = body.id,
        pid = body.pid,
        name = body.name,
        path = body.path,
        author = body.author,
        code = body.code,
        demo = body.demo,
        lastModify = body.lastModify,
        createTime = Date.now(),
        m;

    if (_id) {
        // update
        Module.update({_id: _id}, {
            name: name,
            author: author,
            code: code,
            demo: demo,
            lastModify: Date.now()
        }, function (err) {
            if (err) {
                console.log(err);
                return res.json({
                    code: 10,
                    msg: err.message
                });
            }

            // 写文件
            util.saveFile(moduleFolder + '/' + id + '.js', code, function (result) {
                if (-1 === result) {
                    return res.json({
                        code: 12,
                        msg: 'async file error.'
                    });
                }
                else if (1 === result) {
                    return res.json({
                        code: 0,
                        msg: 'success'
                    });
                }
            });
        });
    }
    else {
        // add
        m = new Module({
            id: id,
            pid: pid,
            name: name,
            path: path,
            author: author,
            code: code,
            demo: demo,
            lastModify: lastModify,
            createTime: createTime
        });

        m.save(function (err, data) {
            if (err) {
                console.log(err);
                return res.json({
                    code: 1,
                    msg: err.message
                });
            }
            // 写文件
            util.saveFile(moduleFolder + '/' + id + '.js', code, function (result) {
                if (-1 === result) {
                    // 回滚
                    Module.findOneAndRemove({_id: data._id}, function () {
                    });
                    return res.json({
                        code: 2,
                        msg: '保存模块出错.'
                    });
                }
                else if (1 === result) {
                    return res.json({
                        code: 0,
                        msg: 'success'
                    });
                }
            });
        });
    }
});

/**
 * 校验模块标识符是否可用
 * @param id  标识符
 * @param cb  处理函数
 */
function checkModuleId(id, cb) {
    // 查库
    Module.find({id: id}, function (err, data) {
        if (err) {
            console.log(err);
            return cb(-2); // 出错
        }
        if (data.length) {
            cb(2); // 库里有
        }
        else {
            // 库里无，扫描文件夹
            util.fileInFolder(id + '.js', moduleFolder, cb);
        }
    });
}

module.exports = router;