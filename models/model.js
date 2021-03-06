var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var projectSchema = new Schema({
    name: String,
    userGroup: [String],
    createTime: {type: Date, default: Date.now}
});

var moduleSchema = new Schema({
    id: {type: String, required: true},
    name: String,
    pid: {type: String, required: true},
    path: String,
    author: String,
    code: String,
    demo: String,
    deps: Schema.Types.Mixed,
    uses: [Schema.Types.Mixed],
    tags: [String],
    modified: {type: Boolean, default: false},
    createTime: {type: Date, default: Date.now},
    lastModify: {type: Date}
});

var historyModuleSchema = new Schema({
    mid: {type: String, required: true},
    code: String,
    moduleDate: {type: Date},
    createTime: {type: Date, default: Date.now}
});

exports.projectSchema = projectSchema;
exports.moduleSchema = moduleSchema;
exports.historyModuleSchema = historyModuleSchema;