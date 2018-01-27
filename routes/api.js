var express = require('express');
var router = express.Router();
var util = require('../util/common');
var log4js = require('log4js');
var log = log4js.getLogger('api');
var request = require('request');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var modelSchema = require('../models/model');
var config = require('../config.json');
var connStr = 'mongodb://' + config.mongodb.server + ':' + config.mongodb.port + '/' + config.mongodb.db;
var connOpt = {};
config.mongodb.user && (connOpt.user = config.mongodb.user);
config.mongodb.pwd && (connOpt.pass = config.mongodb.pwd);
var db = mongoose.createConnection(connStr, connOpt);
var moduleFolder = './public/modules';

var distFolder = './dist';
// var distFolder = './output/dist'; // 测试服务器112.74.41.220的输出地址

var Project = db.model('projects', modelSchema.projectSchema);
var Module = db.model('modules', modelSchema.moduleSchema);
var HistoryModule = db.model('histories', modelSchema.historyModuleSchema);

var moduleDependenciesReg = /define\s*\([^\[]*(?:\[([^\]]+)])?\s*(?:,\s*function|factory)/m;

/**
 * 获取项目列表
 */
router.get('/project/list', function (req, res, next) {
    Project.find({}, function (err, data) {
        if (err) {
            log.log('ERROR', err);
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
    if (!pid) {
        return res.json({
            code: 1,
            msg: 'lost the required parameter project id.'
        });
    }
    Project.findById(pid, function (err, data) {
        if (err) {
            log.log('ERROR', err);
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

    if (projectName) {
        var p = new Project({
            name: projectName,
            userGroup: userGroup.split(',')
        });
        p.save(function (err) {
            if (err) {
                log.log('ERROR', err);
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
    else {
        res.json({
            code: 2,
            msg: 'lost required parameter projectName.'
        });
    }
});

/**
 * 项目复制、复制一个已存在的项目模块至另一个已存在的项目
 */
router.post('/project/copy', function (req, res, next) {
    var body = req.body;
    var fromProject = body.fromProject || '';
    var toProject = body.toProject || '';
    var useMore = body.useMore || '';
    var moreName = body.moreName || '';
    var method = body.method || '';
    var errMsg = [];
    var moduleNameReadyCopy = [];
    var newModuleInfo = [];

    if (fromProject) {
        Module.find({pid: fromProject}, function (err, data) {
            if (err) {
                return res.json({
                    code: 101,
                    msg: 'not found modules of project.'
                });
            }
            /* 开始拷贝资源 */
            var len = data.length;
            data.map(function (v) {
                var name = v.path && v.path.substr(v.path.lastIndexOf('/') + 1), newName = getNewModuleName(name, useMore, moreName);
                var newModuleNode = {};
                if (name && newName) {
                    moduleNameReadyCopy.push(newName);
                    newModuleNode.id = newName;
                    newModuleNode.name = v.name;
                    newModuleNode.author = v.author;
                    newModuleNode.demo = v.demo;
                    newModuleNode.path = v.path.replace(name, newName + '.js');
                    newModuleNode.createTime = new Date();
                    newModuleNode.pid = toProject;
                    newModuleNode.code = v.code.replace(new RegExp('define\\\(([\'|"])' + name.split('.')[0] + '\\1'), 'define("' + newName + '"');
                    newModuleInfo.push(newModuleNode);
                    util.copy(moduleFolder + '/' + name, moduleFolder + '/' + newName + '.js', function (tag, data) {
                        len--;
                        if (!tag) {
                            errMsg.push(name + ' copy failure.');
                        }
                        if (len <= 0) {
                            if (errMsg.length) {
                                res.json({
                                    code: 103,
                                    msg: errMsg.join(',')
                                });
                            }
                            else {
                                if (method == 1) {
                                    /* 开始拷贝记录 使用覆盖策略 */
                                    useCoverPolicyCopyFile(newName, newModuleInfo, res, next);
                                }
                                else if (method == 2) {
                                    /* 开始拷贝&整理记录，使用清空重写策略 */
                                    Module.find({pid: toProject}, function (err, data) {
                                        if (err) {
                                            return res.json({
                                                code: 107,
                                                msg: 'query the destination project failure'
                                            });
                                        }
                                        var readyDeleteFiles = data.map(function (v) {
                                            return moduleFolder + '/' + v.path.substr(v.path.lastIndexOf('/') + 1);
                                        });
                                        util.deleteFiles(readyDeleteFiles, function (tag, deleteFilesInfo) {
                                            if(tag){
                                                Module.find({pid: toProject}).remove(function (deleteDestionationFileErr, deleteDestinationFileResult) {
                                                    if(deleteDestionationFileErr){
                                                        return res.json({
                                                            code: 109,
                                                            msg: 'delete destination module from db has been failed.'
                                                        });
                                                    }
                                                    useCoverPolicyCopyFile(newName, newModuleInfo, res, next);
                                                });
                                            }
                                            else{
                                                res.json({
                                                    code: 108,
                                                    msg: deleteFilesInfo
                                                });
                                            }
                                        });
                                    });
                                }
                                else {
                                    res.json({
                                        code: 106,
                                        msg: 'lost policy.'
                                    });
                                }
                            }
                        }
                    });
                }
            });

        });
    }
    else {
        res.json({
            code: 102,
            msg: 'lost the project source.'
        });
    }

    /**
     * 使用覆盖策略清除记录与重建模块
     * @param newName 新模块名列表
     * @param newModuleInfo 新模块信息列表
     * @param res 响应流
     * @param next node next
     */
    function useCoverPolicyCopyFile(newName, newModuleInfo, res, next) {
        Module.find({id: {$in: newName}}).remove(function (removeErr, removeData) {
            if (removeErr) {
                return res.json({
                    code: 104,
                    msg: 'remove records failure.'
                });
            }
            Module.create(newModuleInfo, function (createErr, createResult) {
                if (createErr) {
                    return res.json({
                        code: 105,
                        msg: 'create module failure.'
                    });
                }
                /* 记录拷贝完成， 则整个流程完成 */
                res.json({
                    code: 0,
                    data: []
                });
            });
        });
    }
});

/**
 * 根据pid获取模块
 */
router.get('/module/list/:pid', function (req, res, next) {
    var pid = req.params['pid'];
    if (!pid) {
        return res.json({
            code: 1,
            msg: 'lost the required parameter project id.'
        });
    }
    Module.find({pid: pid}, {_id: 1, id: 1, name: 1, pid: 1, lastModify: 1}, function (err, data) {
        if (err) {
            log.log('ERROR', err);
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

    if (mid) {
        Module.findById(mid, function (err, data) {
            if (err) {
                log.log('ERROR', err);
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
    else {
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
        if (-2 === result) {
            return res.json({
                code: -2,
                msg: 'mongo error.'
            });
        } else if (-1 === result) {
            return res.json({
                code: -1,
                msg: 'file system error.'
            });
        }
        else if (0 === result) {
            return res.json({
                code: 0,
                msg: 'not file and not record.'
            });
        }
        else if (1 === result) {
            return res.json({
                code: 1,
                msg: 'file exist.'
            });
        }
        else if (2 === result) {
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
    module_save(req, res, next);
});

/**
 * 加载已存在的模块文件
 */
router.post('/module/load', function (req, res, next) {
    var filename = req.body.filename;
    util.readFile(moduleFolder + '/' + filename + '.js', function (result, data) {
        if (result) {
            return res.json({
                code: 0,
                data: data
            });
        } else {
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
    if (modules.length) {
        modules.forEach(function (item) {
            if (item && '' != (item = item.trim())) {
                ms.push(moduleFolder + '/' + item + '.js');
            }
        });
        combName = distFolder + '/' + combName + '.js';
        if (ms.length === 1) combName = ms[0].replace(moduleFolder, distFolder);

        util.compress(ms, combName, function (result) {
            if (-1 === result) {
                log.log('INFO', 'compress module failure when save the file.');
                return res.json({
                    code: 3,
                    msg: 'save file failure.'
                });
            }
            else if (1 === result) {
                return res.json({
                    code: 0,
                    msg: 'success'
                });
            }
            else {
                return res.json({
                    code: 10,
                    msg: 'server error.'
                });
            }
        });
    }
    else {
        return res.json({
            code: 2,
            msg: 'lost required parameter modules.'
        });
    }
});

/**
 * 模块拷贝
 */
router.post('/copy', function (req, res, next) {
    var module = req.body.module;
    if (module) {
        util.copy(moduleFolder + '/' + module + '.js', distFolder + '/' + module + '.js', function (ret, data) {
            if (ret) {
                return res.json({
                    code: 0,
                    data: data
                });
            }
            else {
                return res.json({
                    code: 1,
                    msg: data
                });
            }
        });
    }
    else {
        return res.json({
            code: 2,
            msg: 'lost required parameter module.'
        });
    }
});

/**
 * 数据同步
 */
router.post('/sync', function (req, res, next) {
    var id = req.body.id;
    if (id) {
        var opt = {
            url: config.syncRemoteApi,
            method: 'post',
            form: req.body
        };
        new Promise(function (resolve, reject) {
            Project.find({_id: req.body.pid}, function (err, data) {
                if (err) {
                    reject(err.message);
                }
                else {
                    resolve(data[0].name);
                }
            });
        }).then(function (projectName) {
            req.body.projectName = projectName;
            request(opt, function (err, response, body) {
                if (err) {
                    return res.json({
                        code: 1,
                        msg: err.message
                    });
                }
                else {
                    try {
                        var data = JSON.parse(body);
                        return res.json(data);
                    } catch (e) {
                        res.json({
                            code: 2,
                            data: body
                        });
                    }
                }
            });
        }).catch(function (err) {
            return res.json({
                code: 101,
                msg: err
            });
        });
    }
    else {
        res.json({
            code: 1,
            msg: 'lost required parameter id.'
        });
    }
});

/**
 * 远程同步, 同步服务
 */
router.post('/remotesync', function (req, res, next) {
    var id = req.body.id, pid = req.body.pid, pjname = req.body.projectName;
    if (id && pid) {
        var getModule = new Promise(function (resolve, reject) {
            Module.find({id: id}, {id: 1}, function (err, data) {
                if (err) {
                    reject(err.message);
                }
                else {
                    resolve(data);
                }
            });
        });
        var getProject = new Promise(function (resolve, reject) {
            Project.find({name: pjname}, function (err, data) {
                if (err) {
                    reject(err.message);
                }
                else {
                    resolve(data);
                }
            });
        });

        Promise.all([getModule, getProject]).then(function (result) {
            if (result && result.length === 2) {
                var md = result[0], pd = result[1];

                if (md && md[0] && md[0].id) {
                    req.body._id = md[0]._id;
                }
                else {
                    delete req.body._id;
                }

                if (pd && pd[0]) {
                    req.body.pid = pd[0]._id;
                    module_save(req, res, next);
                }
                else {
                    new Project({
                        name: pjname,
                        userGroup: 'all'
                    }).save(function (err, data) {
                        if (err) {
                            return res.json({
                                code: 16,
                                msg: err.message
                            });
                        }
                        else {
                            req.body.pid = data._id;
                            module_save(req, res, next);
                        }
                    });
                }
            }
            else {
                return res.json({
                    code: 15,
                    msg: 'get result failure.'
                });
            }
        }).catch(function (err) {
            return res.json({
                code: 101,
                msg: err
            });
        });
    }
    else {
        res.json({
            code: 1,
            msg: 'lost required parameter id and pid.'
        });
    }
});

/**
 * 搜索接口
 */
router.post('/search', function (req, res, next) {
    var key = req.body.keys;
    if (key) {
        var re = new RegExp('.*?' + key + '.*?', 'i');
        Module.find({
                $or: [
                    {name: re},
                    {id: key},
                    {tags: {$in: [re]}}
                ]
            }, function (err, data) {
                if (err) {
                    log.log('ERROR', err);
                    return res.json({
                        code: 1,
                        msg: err.message
                    });
                }
                return res.json({
                    code: 0,
                    data: data
                });
            }
        );
    }
    else {
        next();
    }
});

/**
 * 校验文件状态
 */
router.post('/checkfileinfo', function (req, res, next) {
    var fileArr = req.body.files;
    if (fileArr) {
        util.getFileInfo(fileArr.split(',').map(function (m) {
            return moduleFolder + '/' + m;
        }), function (data) {
            res.json({
                code: 0,
                msg: '',
                data: data
            });
        });
    }
    else {
        next();
    }
});

/**
 * 模块依赖分析
 */
router.get('/module/dependencies/:mid', function (req, res, next) {
    var mid = req.params['mid'], deps = {};
    deps.exists = [];
    deps.lostes = [];
    deps.map = {};
    if (mid) {
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
                            if (ret) {
                                return res.json({
                                    code: 0,
                                    data: data
                                });
                            }
                            else {
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
                else {
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
 * 获取模块历史
 */
router.get('/history/:mid', function (req, res, next) {
    var mid = req.params['mid'];
    HistoryModule.find({mid: mid}, {code: 0}).sort({createTime: "desc"}).exec(function (err, data) {
        if (err) {
            return res.json({
                code: 1,
                message: err.message
            });
        }
        res.json({
            code: 0,
            data: data
        });
    });
});

router.get('/history/download/:id', function (req, res, next) {
    var id = req.params["id"];
    if (id) {
        HistoryModule.findById({_id: id}, {code: 1}, function (err, data) {
            if (err) {
                res.end();
            }
            res.set({
                "Content-Type": "application/octet-stream",
                "Content-Disposition": "attachment;filename=" + encodeURIComponent(id + ".js")
            });
            res.end(Buffer.from(data.code, 'utf-8'));
        });
    }
    else {
        res.end();
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
            log.log('ERROR', err);
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
        Module.find({id: {$in: depList}}, function (err, data) {
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
                    deps.map[getMapName(m.id)] = {
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

/**
 * 保存模块 处理逻辑
 * @param req
 * @param res
 * @param next
 */
function module_save(req, res, next) {
    var body = req.body,
        _id = body._id,
        id = body.id,
        pid = body.pid,
        name = body.name,
        path = body.path,
        author = body.author,
        code = body.code,
        demo = body.demo,
        tags = body.tags ? body.tags.split(/,|，/) : [],
        lastModify = body.lastModify,
        m,
        deps = {},
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
                directive = '|' + myDepsList.join('|') + '|';
                getDependencies(myDepsList, deps, function (ret, data) {
                    if (ret) {
                        resolve(deps);
                    }
                    else {
                        reject(data.message);
                    }
                });
            }
            else {
                directive = "";
                resolve(deps);
            }
        }
        else {
            directive = "";
            resolve(deps)
        }
    });

    getDependenciesPromise.then(function (value) {
        return new Promise(function (resolve, reject) {
            Module.find({
                $or: [{'deps.exists': id}, {'deps.lostes': id}]
            }, function (err, data) {
                if (err) {
                    return reject(err.message);
                }
                if (data && data.length) {
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
                else {
                    resolve(uses);
                }
            });
        });
    }).then(save).catch(function (value) {
        log.log('ERROR', value);
        res.json({
            code: 103,
            msg: value
        });
    });

    function save(useMyList) {
        if (_id) {
            // update
            pushHistory(function () {
                Module.findById(_id, function (err, data) {
                    if (err) {
                        update();
                        return;
                    }
                    var hm = new HistoryModule({
                        mid: _id,
                        code: data.code,
                        moduleDate: data.lastModify
                    });
                    hm.save(function (sErr, sData) {
                        console.log('save history module.');
                        update();
                    });
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
                tags: tags,
                lastModify: lastModify
            });
            m.save(function (err, data) {
                if (err) {
                    log.log('ERROR', err);
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

        // 更新模块数据
        function update() {
            Module.update({_id: _id}, {
                name: name,
                author: author,
                code: code,
                demo: demo,
                deps: deps,
                path: path,
                uses: useMyList,
                tags: tags,
                lastModify: Date.now()
            }, function (err) {
                if (err) {
                    log.log('ERROR', err);
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

        // 保存模块历史记录
        function pushHistory(cb) {
            var HISTORY_MAX = config.history_max || 10, callback = cb || function () {
                };

            HistoryModule.find({mid: _id}, {_id: 1}).sort({createTime: 'asc'}).limit(HISTORY_MAX - 1).exec(function (fErr, fData) {
                if (fErr) {
                    return update();
                }

                HistoryModule.find({
                    mid: _id,
                    _id: {
                        $nin: fData.map(function (v) {
                            return mongoose.Types.ObjectId(v._id);
                        })
                    }
                }).remove(function (hErr, hData) {
                    if (hErr) {
                        return update();
                    }
                    callback();
                });
            });
        }
    }
}

/**
 * 获取一个新的模块名
 * @param name 模块名
 * @param preOrNext 前缀或者后缀
 * @param val 前缀或者后缀值
 */
function getNewModuleName(name, preOrNext, val) {
    var n = name.split('.')[0], newName = '';
    if (preOrNext == 1) {
        newName = val + n;
    }
    else if (preOrNext == 2) {
        newName = n + val;
    }
    return newName;
}

function getMapName(name) {
    return name.replace(/([.])/g,'__');
}

module.exports = router;