var express = require('express');
var router = express.Router();
var util = require('../util/common');
var lodash = require('lodash');
var log4js = require('log4js');
var log = log4js.getLogger('api');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var modelSchema = require('../models/model');
var config  = require('../config.json').mongodb;
var connStr = 'mongodb://'+config.server+':'+config.port+'/'+config.db;
var connOpt = {};
config.user && (connOpt.user = config.user);
config.pwd && (connOpt.pass = config.pwd);
var db = mongoose.createConnection(connStr, connOpt);
var moduleFolder = './public/modules';
var distFolder = './public/dist';

var Project = db.model('projects', modelSchema.projectSchema);
var Module = db.model('modules', modelSchema.moduleSchema);

var moduleDependenciesReg = /define\s*\([^\[]*(?:\[([^\]]+)])?\s*(?:,\s*function)/m;

/**
 * 获取项目列表
 */
router.get('/project/list', function (req, res, next) {
    Project.find({}, function (err, data) {
        if(err){
            log.log('ERROR',err);
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
            log.log('ERROR',err);
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
                log.log('ERROR',err);
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
    Module.find({pid: pid},{_id:1, id: 1, name: 1, pid:1}, function (err, data) {
        if(err){
            log.log('ERROR',err);
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
                log.log('ERROR',err);
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
        m,
        deps={},
        uses = [];

    deps.exists = [];
    deps.lostes = [];
    deps.map = {};

    var getDependenciesPromise = new Promise(function (resolve, reject) {
        // 依赖分析
        var myDeps = code.match(moduleDependenciesReg);
        if (myDeps) {
            myDepsList = (myDeps[1] && myDeps[1].split(',') || []).map(function (v) {
                return v.replace(/\s*'|\s*"/g, '');
            });
            if (myDepsList.length) {
                directive = '|'+myDepsList.join('|')+'|';
                getDependencies(myDepsList, deps, function (ret, data) {
                    if(ret) {
                        resolve(deps);
                    }
                    else{
                        reject(data.message);
                    }
                });
            }
            else {
                directive = "";
                resolve(deps);
            }
        }
        else{
            directive = "";
            resolve(deps)
        }
    });

    getDependenciesPromise.then(function (value) {
        return new Promise(function (resolve, reject) {
            Module.find({
                $or:[{'deps.exists': id},{'deps.lostes':id}]
            }, function (err, data) {
                if(err){
                    return reject(err.message);
                }
                if(data && data.length){
                    data.forEach(function (v) {
                        uses.push({
                            _id: v._id,
                            pid: v.pid,
                            id: v.id,
                            name: v.name
                        });
                    });
                    resolve(uses);
                }
                else{
                    resolve(uses);
                }
            });
        });
    }).then(save).catch(function (value) {
        log.log('ERROR',value);
        res.json({
            code: 103,
            msg: value
        });
    });

    function save(useMyList) {
        if (_id) {
            // update
            Module.update({_id: _id}, {
                name: name,
                author: author,
                code: code,
                demo: demo,
                deps: deps,
                uses: useMyList,
                lastModify: Date.now()
            }, function (err) {
                if (err) {
                    log.log('ERROR',err);
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
                deps: deps,
                uses: useMyList,
                lastModify: lastModify
            });
            m.save(function (err, data) {
                if (err) {
                    log.log('ERROR',err);
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

    }
});

/**
 * 加载已存在的模块文件
 */
router.post('/module/load', function (req, res, next) {
    var filename = req.body.filename;
    util.readFile(moduleFolder+'/'+filename+'.js', function (result, data) {
        if(result) {
            return res.json({
                code: 0,
                data: data
            });
        }else{
            return res.json({
                code: 1,
                msg: data.message
            });
        }

    });
});

/**
 * 模块压缩
 */
router.post('/compress', function (req, res, next) {
    var modules = req.body.modules.split(',');
    var combName = req.body.combName || '';
    var ms = [];
    if(modules.length) {
        modules.forEach(function (item) {
            if (item && '' != (item = item.trim())) {
                ms.push(moduleFolder+'/'+item+'.js');
            }
        });
        if(ms.length === 1) combName = ms[0].replace(moduleFolder, distFolder);

        util.compress(ms, combName, function (result) {
            if(-1 === result){
                log.log('INFO', 'compress module failure when save the file.');
                return res.json({
                    code: 3,
                    msg: 'save file failure.'
                });
            }
            else if( 1 === result){
                return res.json({
                    code: 0,
                    msg: 'success'
                });
            }
            else{
                return res.json({
                    code: 10,
                    msg: 'server error.'
                });
            }
        });
    }
    else{
        return res.json({
            code: 2,
            msg: 'lost required parameter modules.'
        });
    }
});

/**
 * 搜索接口
 */
router.post('/search', function (req, res, next) {
    var key = req.body.keys;
    if(key){
        Module.find({name: new RegExp('.*?'+key+'.*?')}, function (err, data) {
            if(err){
                log.log('ERROR',err);
                return res.json({
                    code: 1,
                    msg: err.message
                });
            }
            return res.json({
                code: 0,
                data: data
            });
        });
    }
});

/**
 * 模块依赖分析
 */
router.get('/module/dependencies/:mid', function (req, res, next) {
    var mid = req.params['mid'], deps={};
    deps.exists = [];
    deps.lostes = [];
    deps.map = {};
    if(mid) {
        Module.findById(mid, function (err, data) {
            if (err) {
                log.log("ERROR", err);
                return res.json({
                    code: 1,
                    msg: err.message
                });
            }
            if (data && data.code) {
                var myDeps = data.code.match(moduleDependenciesReg);
                if (myDeps) {
                    var myDepsList = (myDeps[1] && myDeps[1].split(',') || []).map(function (v) {
                        return v.replace(/\s*'|\s*"/g, '');
                    });
                    if (myDepsList.length) {
                        getDependencies(myDepsList, deps, function (ret, data) {
                            if(ret) {
                                return res.json({
                                    code: 0,
                                    data: data
                                });
                            }
                            else{
                                return res.json({
                                    code: 3,
                                    msg: data.message
                                });
                            }
                        });
                    }
                    else {
                        return res.json({
                            code: 0,
                            data: deps
                        });
                    }
                }
                else{
                    return res.json({
                        code: 0,
                        data: deps
                    });
                }
            }
            else {
                return res.json({
                    code: 2,
                    msg: 'lost the module.'
                });
            }
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
            log.log('ERROR',err);
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

/**
 * 获取模块组的依赖列表
 * @param depList  模块组
 * @param deps  依赖表 ， Ref
 * @param cb    回调函数
 */
function getDependencies(depList, deps, cb) {
    depList = depList.filter(function (dep) {
        return !(deps.exists.indexOf(dep) > -1 || deps.lostes.indexOf(dep) > -1);
    });
    if (depList.length) {
        Module.find({id: new RegExp(depList.join('|'))}, function (err, data) {
            if (err) {
                log.log('ERROR', err);
                return cb(false, err);
            }
            if (data.length) {
                var curModuleDeps = [];
                data.forEach(function (m) {
                    var mDeps = m.code.match(moduleDependenciesReg);
                    if (mDeps) {
                        var mDepList = (mDeps[1] && mDeps[1].split(',') || []).map(function (v) {
                            return v.replace(/\s*'|\s*"/g, '');
                        });
                        mDepList.length && (curModuleDeps = curModuleDeps.concat(mDepList));
                    }
                    deps.exists.push(m.id);
                    deps.map[m.id] = {
                        name: m.name,
                        mid: m._id,
                        pid: m.pid
                    };
                    depList.splice(depList.indexOf(m.id), 1);
                });
                depList.length && (deps.lostes = deps.lostes.concat(depList));
                curModuleDeps = util.uniq(curModuleDeps);
                // !deps.directive && (deps.directive = lodash.clone(deps, true));
                getDependencies(curModuleDeps, deps, cb);
            }
            else {
                deps.lostes = deps.lostes.concat(depList);
                // !deps.directive && (deps.directive = lodash.clone(deps, true));
                getDependencies([], deps, cb);
            }
        });
    }
    else {
        cb(true, deps);
    }
}

module.exports = router;