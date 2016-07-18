var fs = require('fs');
var path = require('path');
var uglify = require('uglify-js');
// var babel = require('babel');

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
                console.log(err);
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
                console.log(err);
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
    var files = Array.isArray(inFiles) ? inFiles : [inFiles], originalCode, distCode='', ast;
    var compresser = uglify.Compressor({
        sequences: true
    });
    try {
        for (var i = 0, l = files.length; i < l; i++) {
            originalCode = fs.readFileSync(inFiles[i], 'utf-8');
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
        cb(10, e);
    }
};