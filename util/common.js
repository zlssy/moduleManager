var fs = require('fs');
var path = require('path');
var uglify = require('uglify-js');
var babel = require('babel-core');
var log = require('log4js');
var logger = log.getLogger('app');
var config = require('../config.json');

/**
 * 遍历目录，并判定制定文件是否存在 只读一层目录
 * @param filename  要查找的文件
 * @param folder  要遍历的目录
 * @param cb  处理函数 -1 出错， 1: 找到, 0: 没找到
 */
function fileInFolder(filename, folder, cb) {
    var exist = false;
    if (filename && folder) {
        fs.readdir(folder, function (err, files) {
            if (err) {
                logger.log('ERROR',err);
                return cb(-1);
            }
            else {
                files.forEach(function (item) {
                    // var tmpPath = folder + '/' + item;
                    if (item === filename) {
                        exist = true;
                        return cb(1);
                    }
                });
                if(!exist) {
                    cb(0);
                }
            }
        });
    }
}

exports.fileInFolder = fileInFolder;

/**
 * 保存文件至指定目录
 * @param filename
 * @param data
 * @param cb
 */
exports.saveFile = function (filename, data, cb) {
    if(filename && data){
        fs.writeFile(path.resolve(filename), data, {encoding: 'utf-8'}, function (err) {
            if(err){
                logger.log('ERROR',err);
                cb(-1);
            }
            else {
                cb(1);
            }
        });
    }
};

/**
 * 读取指定文件
 * @param filename
 * @param cb
 */
exports.readFile = function (filename, cb) {
    if(filename){
        fs.stat(filename, function (err, data) {
            if(err){
                logger.log('ERROR', err);
                return cb(false, err);
            }
            fs.readFile(filename,{encoding: 'utf-8'}, function (fe, d) {
                if(fe){
                    return cb(false, err);
                }
                cb(true, d);
            });
        });
    }
};

/**
 * 获取本地时间，单位毫秒
 * @param time
 */
exports.getLocalTime = function (time) {
    return time - (new Date().getTimezoneOffset()) * 60000;
};

exports.compress = function (inFiles, outFile, cb) {
    var files = Array.isArray(inFiles) ? inFiles : [inFiles], originalCode, distCode='', ast, m;
    var compresser = uglify.Compressor({
        sequences: true
    });
    try {
        for (var i = 0, l = files.length; i < l; i++) {
            originalCode = fs.readFileSync(inFiles[i], 'utf-8');
            // originalCode = originalCode.replace(/^\s+|\s+$/, '');
            // m = originalCode.match(/^(define\([^{]+\{)((?:\s|\S)+)}\);?$/m);
            // if(m && m.length >= 3) {
            //     m[2] = babel.transform(m[2], {
            //         presets: ['es2015']
            //     }).code;
            //     originalCode = m[1]+m[2]+'})';
            // }
            originalCode = babel.transform(originalCode, {
                presets: ['es2015']
            }).code;
            !config.babel.useStrict && (originalCode = originalCode.replace(/(['|"]*)(use strict)\1;?/, ''));
            ast = uglify.parse(originalCode);
            ast.figure_out_scope();
            ast.compute_char_frequency();
            ast.mangle_names();
            ast = ast.transform(compresser);
            distCode += ast.print_to_string() + ';';
        }
        exports.saveFile(outFile, distCode, cb);
    }
    catch (e){
        console.log(e);
        cb(10, e);
    }
};

exports.uniq = function (arr) {
    var ret = [];
    arr.forEach(function (v) {
        ret.indexOf(v) < 0 && ret.push(v);
    });
    return ret;
};