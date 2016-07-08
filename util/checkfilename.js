var fs = require('fs');
var path = require('path');

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